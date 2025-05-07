const Policy = require('../models/Policy');
const Department = require('../models/Department');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const axios = require('axios');
// We'll add docx text extraction later with a proper library

// @desc    Create a new policy
// @route   POST /api/policies/create
// @access  Admin only
exports.createPolicy = async (req, res) => {
    try {
        console.log('--- Policy Creation Request Start ---');
        console.log('Received policy data:', req.body);
        if (req.files) {
            console.log('Received files:', Object.keys(req.files));
            if (req.files.wordFile) console.log('Word file:', req.files.wordFile[0]);
            if (req.files.pdfFile) console.log('PDF file:', req.files.pdfFile[0]);
        } else {
            console.log('No files received');
        }
        
        // Extract fields
        const { 
            name, 
            department, 
            approvalDate, 
            reviewCycleYears, 
            approvalValidity, 
            status
        } = req.body;

        const departmentId = department; // Use department directly as it's the field name used in frontend

        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                message: 'Policy name is required',
                field: 'name'
            });
        }
        
        if (!departmentId) {
            return res.status(400).json({ 
                message: 'Department is required',
                field: 'department'
            });
        }
        
        if (!approvalDate) {
            return res.status(400).json({ 
                message: 'Approval date is required',
                field: 'approvalDate'
            });
        }
        
        if (!reviewCycleYears) {
            return res.status(400).json({ 
                message: 'Review cycle is required',
                field: 'reviewCycleYears'
            });
        }
        
        if (!approvalValidity) {
            return res.status(400).json({ 
                message: 'Approval validity date is required',
                field: 'approvalValidity'
            });
        }

        // Validate the department exists
        const departmentExists = await Department.findById(departmentId);
        if (!departmentExists) {
            return res.status(400).json({ 
                message: 'Department not found',
                details: `Department with ID ${departmentId} does not exist`,
                field: 'department'
            });
        }

        // Process file uploads if present
        let wordFileUrl = null;
        let wordFileName = null;
        let pdfFileUrl = null;
        let pdfFileName = null;
        let textContent = name; // For now, just use the policy name

        if (req.files && req.files.wordFile && req.files.wordFile.length > 0) {
            const wordFile = req.files.wordFile[0];
            wordFileUrl = `/uploads/${wordFile.filename}`;
            wordFileName = wordFile.originalname;
        }
        if (req.files && req.files.pdfFile && req.files.pdfFile.length > 0) {
            const pdfFile = req.files.pdfFile[0];
            pdfFileUrl = `/uploads/${pdfFile.filename}`;
            pdfFileName = pdfFile.originalname;
        }

        // Create policy object with provided data
        const policyData = {
            name,
            department: departmentId,
            approvalDate,
            reviewCycleYears: parseInt(reviewCycleYears, 10),
            status: status || 'valid',
            textContent
        };

        // Only add these fields if they exist
        if (approvalValidity) policyData.approvalValidity = approvalValidity;
        if (wordFileUrl) policyData.wordFileUrl = wordFileUrl;
        if (wordFileName) policyData.wordFileName = wordFileName;
        if (pdfFileUrl) policyData.pdfFileUrl = pdfFileUrl;
        if (pdfFileName) policyData.pdfFileName = pdfFileName;

        // Create the new policy
        const policy = await Policy.create(policyData);

        console.log('Policy created successfully:', policy._id);
        res.status(201).json(policy);
    } catch (err) {
        console.error('Policy creation error:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to create policy', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// @desc    Get all policies
// @route   GET /api/policies/all
// @access  Public
exports.getPolicies = async (req, res) => {
    try {
        const { departmentId } = req.query;
        const filter = departmentId ? { department: departmentId } : {};

        const policies = await Policy.find(filter).populate('department');
        res.json(policies);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching policies', error: err.message });
    }
};

// @desc    Search policies
// @route   GET /api/policies/search
// @access  Public
exports.searchPolicies = async (req, res) => {
    try {
        const { query, departmentId } = req.query;
        
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        // Modified to use regex for more flexible searching
        // This provides better partial matches than text search
        let filter = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { textContent: { $regex: query, $options: 'i' } }
            ]
        };
        
        // Add department filter if provided
        if (departmentId) {
            filter.department = departmentId;
        }
        
        console.log('Search filter:', JSON.stringify(filter));
        
        const policies = await Policy.find(filter)
            .populate('department');
            
        console.log(`Found ${policies.length} policies matching query "${query}"`);
        res.json(policies);
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ message: 'Error searching policies', error: err.message });
    }
};

// @desc    Search policy content
// @route   GET /api/policies/search-content
// @access  Public
exports.searchPolicyContent = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const policies = await Policy.find({}).populate('department');
    const results = [];

    for (const policy of policies) {
      if (!policy.wordFileUrl) continue;

      let filePath = null; // Declare filePath here, initialize to null

      try {
        // Construct the absolute file path
        // policy.wordFileUrl is like '/uploads/filename.docx'
        // path.join needs to go up one level from controllers to the project root where 'uploads' is.
        // Assumes 'uploads' directory is at the root of the backend project, sibling to 'controllers', 'models' etc.
        // If 'uploads' is at the very root of the 'docs-manager' alongside 'backend' and 'frontend',
        // the path needs to be path.join(__dirname, '..', '..', policy.wordFileUrl)
        // Based on typical project structure, let's assume 'uploads' is inside 'backend'
        filePath = path.join(__dirname, '..', policy.wordFileUrl); // Goes from /backend/controllers -> /backend -> /backend/uploads/file.docx

        console.log(`Attempting to read Word file from path: ${filePath}`); // Debugging

        // Read the file directly from the filesystem
        const fileBuffer = await fs.promises.readFile(filePath);

        const { value: text } = await mammoth.extractRawText({
          buffer: fileBuffer // Use the file buffer directly
        });

        // Split text into sentences and filter empty ones
        const sentences = text.split(/[.!?]\s+/).filter(s => s.trim());
        const matches = [];
        let totalOccurrences = 0;

        sentences.forEach((sentence, index) => {
          const regex = new RegExp(query, 'gi');
          const occurrences = (sentence.match(regex) || []).length;

          if (occurrences > 0) {
            totalOccurrences += occurrences;
            
            // Get only previous sentence and current sentence
            const start = Math.max(0, index - 1);
            const end = index + 1;
            const context = sentences.slice(start, end + 1).join('. ');

            matches.push({
              excerpt: context.trim() + '.',
              highlight: query,
              occurrences
            });
          }
        });

        if (matches.length > 0) {
          results.push({
            policy: {
              _id: policy._id,
              name: policy.name,
              department: policy.department?.name,
              fileName: policy.wordFileUrl.split('/').pop()
            },
            matches,
            totalOccurrences
          });
        }
      } catch (error) {
        console.error(`Error processing file for policy ${policy.name} (Original URL: ${policy.wordFileUrl}):`, error.message);
        if (error.code === 'ENOENT') {
            // filePath here will either be the constructed path or null if path.join itself failed (unlikely for ENOENT)
            console.error(`File not found at constructed path: ${filePath}. Check if the path is correct and the file exists.`);
        }
        continue;
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Content search error:', error);
    res.status(500).json({ message: 'Error searching policy content' });
  }
};

// @desc    Get policy statistics
// @route   GET /api/policies/stats
// @access  Public
exports.getPolicyStats = async (req, res) => {
    try {
        const { departmentId } = req.query;
        
        // Base match condition
        let matchCondition = {};
        if (departmentId) {
            matchCondition.department = mongoose.Types.ObjectId(departmentId);
        }
        
        const stats = await Policy.aggregate([
            { $match: matchCondition },
            { 
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                } 
            }
        ]);
        
        // Format results into a more usable structure
        const result = {
            total: 0,
            valid: 0,
            expired: 0,
            draft: 0
        };
        
        stats.forEach(stat => {
            result[stat._id] = stat.count;
            result.total += stat.count;
        });
        
        res.json(result);
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ message: 'Error fetching policy statistics', error: err.message });
    }
};

// @desc    Get a single policy
// @route   GET /api/policies/policy/:id
// @access  Public
exports.getPolicy = async (req, res) => {
    try {
        const policy = await Policy.findById(req.params.id).populate('department');
        if (!policy) return res.status(404).json({ message: 'Policy not found' });
        res.json(policy);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching policy', error: err.message });
    }
};

// @desc    Update a policy
// @route   PUT /api/policies/update/:id
// @access  Public
exports.updatePolicy = async (req, res) => {
    try {
        console.log('Updating policy data:', req.body);
        console.log('Updating cloudinary files:', req.cloudinaryFiles);
        
        const { id } = req.params;
        const { 
            name, 
            department, 
            approvalDate, 
            reviewCycleYears, 
            approvalValidity, 
            status
        } = req.body;

        // Check if policy exists
        const policyExists = await Policy.findById(id);
        if (!policyExists) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        
        // Process file uploads if present
        let wordFileUrl = undefined;
        let wordFileName = undefined;
        let pdfFileUrl = undefined;
        let pdfFileName = undefined;
        let textContent = name; // Default to name

        // Delete old files if new ones are uploaded
        if (req.files && req.files.wordFile && req.files.wordFile.length > 0) {
            if (policyExists.wordFileUrl) {
                const oldPath = path.join(__dirname, '..', policyExists.wordFileUrl);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            const wordFile = req.files.wordFile[0];
            wordFileUrl = `/uploads/${wordFile.filename}`;
            wordFileName = wordFile.originalname;
        }
        if (req.files && req.files.pdfFile && req.files.pdfFile.length > 0) {
            if (policyExists.pdfFileUrl) {
                const oldPath = path.join(__dirname, '..', policyExists.pdfFileUrl);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            const pdfFile = req.files.pdfFile[0];
            pdfFileUrl = `/uploads/${pdfFile.filename}`;
            pdfFileName = pdfFile.originalname;
        }

        // Create update object with provided data
        const updateData = {
            name,
            department,
            approvalDate,
            reviewCycleYears: parseInt(reviewCycleYears, 10),
            status: status || 'valid',
            textContent
        };

        // Only add these fields if they exist
        if (approvalValidity) updateData.approvalValidity = approvalValidity;
        if (wordFileUrl) updateData.wordFileUrl = wordFileUrl;
        if (wordFileName) updateData.wordFileName = wordFileName;
        if (pdfFileUrl) updateData.pdfFileUrl = pdfFileUrl;
        if (pdfFileName) updateData.pdfFileName = pdfFileName;

        const updatedPolicy = await Policy.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json(updatedPolicy);
    } catch (err) {
        console.error('Policy update error:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Error updating policy', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

// @desc    Download policy file
// @route   GET /api/policies/download/:id/:fileType
// @access  Public
exports.downloadPolicyFile = async (req, res) => {
    try {
        const { id, fileType } = req.params;
        
        if (!['word', 'pdf'].includes(fileType)) {
            return res.status(400).json({ message: 'Invalid file type. Must be "word" or "pdf".' });
        }
        
        const policy = await Policy.findById(id);
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        
        let fileUrl;
        let fileName;
        
        // Get a sanitized policy name for the filename
        const sanitizedPolicyName = policy.name
            .replace(/[^\w\u0600-\u06FF\s.-]/g, '') // Keep Arabic characters, alphanumeric, dots, hyphens
            .replace(/\s+/g, '_'); // Replace spaces with underscores
        
        if (fileType === 'word') {
            fileUrl = policy.wordFileUrl;
            fileName = `${sanitizedPolicyName}.docx`;
        } else {
            fileUrl = policy.pdfFileUrl;
            fileName = `${sanitizedPolicyName}.pdf`;
        }
        
        if (!fileUrl) {
            return res.status(404).json({ message: `${fileType} file not found for this policy` });
        }
        
        // Serve the file from disk
        const filePath = path.join(__dirname, '..', fileUrl);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        res.download(filePath, fileName);
    } catch (err) {
        console.error('File download error:', err);
        res.status(500).json({ 
            status: 'error',
            message: 'Error downloading file', 
            error: err.message
        });
    }
};

// @desc    Update policy statuses
// @route   POST /api/policies/update-statuses
// @access  Admin
exports.updatePolicyStatuses = async (req, res) => {
    try {
        const updatedCount = await Policy.updateAllStatuses();
        res.json({ 
            message: `Updated ${updatedCount} policies to expired status`,
            updatedCount
        });
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ 
            message: 'Error updating policy statuses', 
            error: err.message
        });
    }
};

// @desc    Delete a policy
// @route   DELETE /api/policies/delete/:id
// @access  Public
exports.deletePolicy = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Attempting to delete policy with ID: ${id}`);
        
        // Find the policy to get file URLs before deletion
        const policy = await Policy.findById(id);
        
        if (!policy) {
            return res.status(404).json({ message: 'Policy not found' });
        }
        
        console.log(`Policy found. Name: ${policy.name}`);
        
        // Delete associated files from disk
        const filesToDelete = [];
        if (policy.pdfFileUrl) filesToDelete.push(policy.pdfFileUrl);
        if (policy.wordFileUrl) filesToDelete.push(policy.wordFileUrl);
        
        console.log(`Found ${filesToDelete.length} files to delete from Cloudinary`);
        
        // Delete each file from disk
        for (const fileUrl of filesToDelete) {
            const filePath = path.join(__dirname, '..', fileUrl);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
            }
        }
        
        // Delete the policy from the database
        await Policy.findByIdAndDelete(id);
        console.log(`Policy ${id} deleted from database`);
        
        res.status(200).json({ message: 'Policy deleted successfully' });
    } catch (error) {
        console.error('Error in deletePolicy controller:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
