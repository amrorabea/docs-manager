const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const savedFilename = file.fieldname + '-' + uniqueSuffix + ext;
    
    // Store original filename in request object
    if (!req.originalFileNames) {
      req.originalFileNames = {};
    }
    req.originalFileNames[file.fieldname] = file.originalname;
    
    cb(null, savedFilename);
  }
});

// Filter files by type
const fileFilter = (req, file, cb) => {
  // Allow Word documents and PDFs
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

// Create multer upload instance
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  }
});

// Middleware for policy file uploads
const policyUpload = upload.fields([
  { name: 'wordFile', maxCount: 1 },
  { name: 'pdfFile', maxCount: 1 }
]);

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

module.exports = { policyUpload, handleUploadErrors }; 