const Policy = require('../models/Policy');
const Department = require('../models/Department');
const path = require('path');
const fs = require('fs');
// We'll add docx text extraction later with a proper library

// Helper to get file URL
const getFileUrl = (req, file) => {
    if (!file) return null;
    // In a production environment, this would be a proper URL or CDN link
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    return `${baseUrl}/uploads/${file.filename}`;
};

// @desc    Create a new policy
// @route   POST /api/policies/create
// @access  Public
exports.createPolicy = async (req, res) => {
    try {
        console.log('Received policy data:', req.body);
        console.log('Received files:', req.files);
        console.log('Original filenames:', req.originalFileNames);
        
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

        // Validate the department exists
        const departmentExists = await Department.findById(departmentId);
        if (!departmentExists) {
            return res.status(404).json({ 
                message: 'Department not found',
                details: `Department with ID ${departmentId} does not exist` 
            });
        }

        // Process file uploads if present
        let wordFileUrl = null;
        let wordFileName = null;
        let pdfFileUrl = null;
        let pdfFileName = null;
        let textContent = ''; // Will be populated with extracted text
        
        if (req.files && req.files.wordFile) {
            wordFileUrl = getFileUrl(req, req.files.wordFile[0]);
            wordFileName = req.originalFileNames?.wordFile || req.files.wordFile[0].originalname;
            
            // Here we would extract text from Word document for indexing
            // This will be implemented with a proper library
            textContent = name; // For now, just use the policy name
        }
        
        if (req.files && req.files.pdfFile) {
            pdfFileUrl = getFileUrl(req, req.files.pdfFile[0]);
            pdfFileName = req.originalFileNames?.pdfFile || req.files.pdfFile[0].originalname;
            
            // Here we would extract text from PDF for indexing if needed
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

        res.status(201).json(policy);
    } catch (err) {
        console.error('Policy creation error:', err);
        res.status(500).json({ 
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
        console.log('Updating files:', req.files);
        console.log('Original filenames:', req.originalFileNames);
        
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
        
        if (req.files && req.files.wordFile) {
            wordFileUrl = getFileUrl(req, req.files.wordFile[0]);
            wordFileName = req.originalFileNames?.wordFile || req.files.wordFile[0].originalname;
            
            // Here we would extract text from Word document for indexing
            // Will be implemented with proper library
        }
        
        if (req.files && req.files.pdfFile) {
            pdfFileUrl = getFileUrl(req, req.files.pdfFile[0]);
            pdfFileName = req.originalFileNames?.pdfFile || req.files.pdfFile[0].originalname;
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
        
        if (fileType === 'word') {
            fileUrl = policy.wordFileUrl;
            fileName = policy.wordFileName || 'document.docx';
        } else {
            fileUrl = policy.pdfFileUrl;
            fileName = policy.pdfFileName || 'document.pdf';
        }
        
        if (!fileUrl) {
            return res.status(404).json({ message: `${fileType} file not found for this policy` });
        }
        
        // Extract the local file path from the URL
        const localPath = path.join(__dirname, '../uploads', path.basename(fileUrl));
        
        // Check if file exists
        if (!fs.existsSync(localPath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }
        
        // Set headers for file download with original filename
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', fileType === 'word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
        
        // Stream the file
        const fileStream = fs.createReadStream(localPath);
        fileStream.pipe(res);
        
    } catch (err) {
        console.error('File download error:', err);
        res.status(500).json({ 
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
        const deletedPolicy = await Policy.findByIdAndDelete(req.params.id);
        if (!deletedPolicy) return res.status(404).json({ message: 'Policy not found' });
        
        // Delete associated files if they exist
        if (deletedPolicy.wordFileUrl) {
            const wordFilePath = path.join(__dirname, '../uploads', path.basename(deletedPolicy.wordFileUrl));
            if (fs.existsSync(wordFilePath)) {
                fs.unlinkSync(wordFilePath);
            }
        }
        
        if (deletedPolicy.pdfFileUrl) {
            const pdfFilePath = path.join(__dirname, '../uploads', path.basename(deletedPolicy.pdfFileUrl));
            if (fs.existsSync(pdfFilePath)) {
                fs.unlinkSync(pdfFilePath);
            }
        }
        
        res.status(200).json({ message: 'Policy deleted' });
    } catch (err) {
        console.error('Policy deletion error:', err);
        res.status(500).json({ 
            message: 'Error deleting policy', 
            error: err.message
        });
    }
};
