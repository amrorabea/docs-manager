const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinaryConfig');
const { promises: fsPromises } = require('fs');

// Temporary storage for files before uploading to Cloudinary
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Filter files by type
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'wordFile') {
    if (file.mimetype === 'application/msword' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Word file must be .doc or .docx format'), false);
    }
  } else if (file.fieldname === 'pdfFile') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDF file must be .pdf format'), false);
    }
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  }
});

// Middleware for document uploads
const documentUpload = upload.fields([
  { name: 'wordFile', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]);

// Middleware to upload files to Cloudinary after multer processing
const uploadToCloudinary = async (req, res, next) => {
  try {
    if (!req.files) {
      return next();
    }

    req.cloudinaryFiles = {};

    // Process Word file if it exists
    if (req.files.wordFile && req.files.wordFile.length > 0) {
      const wordFile = req.files.wordFile[0];
      console.log('Uploading Word file to Cloudinary:', wordFile.originalname);
      
      try {
        const result = await cloudinary.uploader.upload(wordFile.path, {
          resource_type: 'auto',
          folder: 'documents/word',
          public_id: path.parse(wordFile.originalname).name,
          use_filename: true,
          unique_filename: true
        });
        
        console.log('Word file upload result:', result);
        
        req.cloudinaryFiles.wordFile = {
          url: result.secure_url,
          public_id: result.public_id,
          originalName: wordFile.originalname,
          assetId: result.asset_id,
          resourceType: result.resource_type,
          format: result.format
        };
        
        // Delete the temp file
        await fsPromises.unlink(wordFile.path);
      } catch (error) {
        console.error('Error uploading Word file to Cloudinary:', error);
        throw error;
      }
    }

    // Process PDF file if it exists
    if (req.files.pdfFile && req.files.pdfFile.length > 0) {
      const pdfFile = req.files.pdfFile[0];
      console.log('Uploading PDF file to Cloudinary:', pdfFile.originalname);
      
      try {
        const result = await cloudinary.uploader.upload(pdfFile.path, {
          resource_type: 'auto',
          folder: 'documents/pdf',
          public_id: path.parse(pdfFile.originalname).name,
          use_filename: true,
          unique_filename: true
        });
        
        console.log('PDF file upload result:', result);
        
        req.cloudinaryFiles.pdfFile = {
          url: result.secure_url,
          public_id: result.public_id,
          originalName: pdfFile.originalname,
          assetId: result.asset_id,
          resourceType: result.resource_type,
          format: result.format
        };
        
        // Delete the temp file
        await fsPromises.unlink(pdfFile.path);
      } catch (error) {
        console.error('Error uploading PDF file to Cloudinary:', error);
        throw error;
      }
    }

    next();
  } catch (error) {
    // Clean up temp files in case of error
    if (req.files) {
      for (const fileArray of Object.values(req.files)) {
        for (const file of fileArray) {
          if (fs.existsSync(file.path)) {
            await fsPromises.unlink(file.path).catch(err => console.error('Error deleting temp file:', err));
          }
        }
      }
    }
    next(error);
  }
};

// Error handler middleware for multer errors
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 10MB.' 
      });
    }
    return res.status(400).json({ 
      message: `Upload error: ${err.message}` 
    });
  } else if (err) {
    return res.status(400).json({ 
      message: err.message || 'Error processing file upload' 
    });
  }
  next();
};

module.exports = { 
  documentUpload, 
  uploadToCloudinary, 
  handleUploadErrors 
}; 