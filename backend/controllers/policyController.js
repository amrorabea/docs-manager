const Policy = require('../models/Policy');
const Department = require('../models/Department');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinaryConfig');
const mammoth = require('mammoth');
const axios = require('axios');
// We'll add docx text extraction later with a proper library

// Helper to handle Cloudinary URLs
const getFileUrl = (req, fileType) => {
    if (!req.cloudinaryFiles || !req.cloudinaryFiles[fileType]) return null;
    return req.cloudinaryFiles[fileType].url;
};

// Helper function to get the correct Cloudinary parameters for a file
function getCloudinaryResourceInfo(url) {
    if (!url) return { publicId: null, resourceType: null };
    
    console.log('Extracting Cloudinary info from URL:', url);
    
    try {
        // Extract the public ID and determine resource type from the URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        
        // Determine file extension from the URL
        const extension = pathParts[pathParts.length - 1].split('.').pop().toLowerCase();
        
        // Determine resource type based on file extension
        let resourceType = 'raw'; // Default resource type
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            resourceType = 'image';
        } else if (['mp4', 'mov'].includes(extension)) {
            resourceType = 'video';
        } else if (['pdf', 'doc', 'docx'].includes(extension)) {
            resourceType = 'raw'; // Documents are typically 'raw' in Cloudinary
        }
        
        // Extract publicId - handle various URL formats
        let publicId = null;
        
        // Check for several common Cloudinary URL patterns
        
        // Pattern 1: Standard Cloudinary URL with /upload/ path
        if (url.includes('/upload/')) {
            console.log('Using standard Cloudinary URL pattern with /upload/');
            const uploadParts = url.split('/upload/');
            if (uploadParts.length > 1) {
                // Get everything after /upload/
                let pathAfterUpload = uploadParts[1];
                
                // Remove query string if present
                if (pathAfterUpload.includes('?')) {
                    pathAfterUpload = pathAfterUpload.split('?')[0];
                }
                
                // Remove version if present (v1234567/)
                if (pathAfterUpload.match(/^v\d+\//)) {
                    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
                }
                
                // This is the full public ID including the file extension
                const fullPublicId = pathAfterUpload;
                
                // Some Cloudinary configurations require extension, others don't
                // We'll return both with and without extension
                if (fullPublicId.includes('.')) {
                    publicId = fullPublicId.substring(0, fullPublicId.lastIndexOf('.'));
                    console.log(`Extracted publicId without extension: ${publicId}`);
                    // But we'll use the full ID including extension
                    publicId = fullPublicId;
                } else {
                    publicId = fullPublicId;
                }
            }
        }
        
        // Pattern 2: URL with folder structure like /documents/word/ or /documents/pdf/
        if (!publicId) {
            console.log('Using folder structure pattern');
            // Try to identify folder structure in URL
            if (url.includes('/documents/word/')) {
                const parts = url.split('/documents/word/');
                const filename = parts[parts.length - 1].split('?')[0]; // Remove query params
                publicId = 'documents/word/' + filename;
                console.log(`Extracted publicId from folder structure: ${publicId}`);
            } else if (url.includes('/documents/pdf/')) {
                const parts = url.split('/documents/pdf/');
                const filename = parts[parts.length - 1].split('?')[0]; // Remove query params
                publicId = 'documents/pdf/' + filename;
                console.log(`Extracted publicId from folder structure: ${publicId}`);
            }
        }
        
        // Pattern 3: Just use the filename as public ID with appropriate folder
        if (!publicId) {
            console.log('Using filename-based pattern');
            // Last resort fallback - get filename and add folder
            const filename = pathParts[pathParts.length - 1].split('?')[0]; // Get filename and remove query params
            
            // Add appropriate folder based on extension
            if (['doc', 'docx'].includes(extension)) {
                publicId = `documents/word/${filename}`;
            } else if (extension === 'pdf') {
                publicId = `documents/pdf/${filename}`;
            } else {
                publicId = filename;
            }
            console.log(`Extracted publicId using filename: ${publicId}`);
        }
        
        console.log('Final extracted Cloudinary info:', { publicId, resourceType, extension });
        return { publicId, resourceType };
    } catch (error) {
        console.error('Error extracting Cloudinary info:', error);
        
        // Fallback method for if parsing fails
        try {
            console.log('Using fallback extraction method');
            // Simple extraction based on URL path and extension
            const urlPath = url.split('?')[0]; // Remove query parameters
            const pathParts = urlPath.split('/');
            const filename = pathParts[pathParts.length - 1];
            const extension = filename.split('.').pop().toLowerCase();
            const filenameWithoutExt = filename.split('.')[0];
            
            // Determine folder path based on extension
            let publicId;
            if (['doc', 'docx'].includes(extension)) {
                publicId = `documents/word/${filename}`;
            } else if (extension === 'pdf') {
                publicId = `documents/pdf/${filename}`;
            } else {
                publicId = filename;
            }
            
            // Determine resource type
            let resourceType = 'raw';
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
                resourceType = 'image';
            } else if (['mp4', 'mov'].includes(extension)) {
                resourceType = 'video';
            }
            
            console.log('Fallback Cloudinary info:', { publicId, resourceType, extension });
            return { publicId, resourceType };
        } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
            return { publicId: null, resourceType: null };
        }
    }
}

// @desc    Create a new policy
// @route   POST /api/policies/create
// @access  Admin only
exports.createPolicy = async (req, res) => {
    try {
        console.log('Received policy data:', req.body);
        console.log('Received cloudinary files:', req.cloudinaryFiles);
        
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
        let textContent = ''; // Will be populated with extracted text
        
        if (req.cloudinaryFiles && req.cloudinaryFiles.wordFile) {
            wordFileUrl = req.cloudinaryFiles.wordFile.url;
            wordFileName = req.cloudinaryFiles.wordFile.originalName;
            
            // Here we would extract text from Word document for indexing
            // This will be implemented with a proper library
            textContent = name; // For now, just use the policy name
        }
        
        if (req.cloudinaryFiles && req.cloudinaryFiles.pdfFile) {
            pdfFileUrl = req.cloudinaryFiles.pdfFile.url;
            pdfFileName = req.cloudinaryFiles.pdfFile.originalName;
            
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

      try {
        const response = await axios.get(policy.wordFileUrl, {
          responseType: 'arraybuffer'
        });

        const { value: text } = await mammoth.extractRawText({
          buffer: response.data
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
        console.error(`Error processing file for policy ${policy.name}:`, error);
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
        
        // Check if we need to delete existing Word file from Cloudinary
        if (req.cloudinaryFiles && req.cloudinaryFiles.wordFile) {
            // If there's an existing Word file and we're uploading a new one, delete the old one first
            if (policyExists.wordFileUrl) {
                const { publicId, resourceType } = getCloudinaryResourceInfo(policyExists.wordFileUrl);
                
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                    console.log(`Successfully deleted old Word file from Cloudinary: ${publicId}`);
                } catch (err) {
                    console.error('Error deleting old Word file from Cloudinary:', err);
                }
            }
            
            // Set new Word file information
            wordFileUrl = req.cloudinaryFiles.wordFile.url;
            wordFileName = req.cloudinaryFiles.wordFile.originalName;
        }
        
        // Check if we need to delete existing PDF file from Cloudinary
        if (req.cloudinaryFiles && req.cloudinaryFiles.pdfFile) {
            // If there's an existing PDF file and we're uploading a new one, delete the old one first
            if (policyExists.pdfFileUrl) {
                const { publicId, resourceType } = getCloudinaryResourceInfo(policyExists.pdfFileUrl);
                
                try {
                    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                    console.log(`Successfully deleted old PDF file from Cloudinary: ${publicId}`);
                } catch (err) {
                    console.error('Error deleting old PDF file from Cloudinary:', err);
                }
            }
            
            // Set new PDF file information
            pdfFileUrl = req.cloudinaryFiles.pdfFile.url;
            pdfFileName = req.cloudinaryFiles.pdfFile.originalName;
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
        
        // Check if the URL needs to be modified for correct resource type access
        if (fileUrl.includes('/image/upload/') && fileType === 'pdf') {
            // Fix the URL to use raw resource type instead of image for PDFs
            fileUrl = fileUrl.replace('/image/upload/', '/raw/upload/');
            console.log(`Modified PDF URL to use raw resource type: ${fileUrl}`);
        }
        
        // Ensure URL is properly encoded 
        try {
            // Parse the URL first to handle any existing encoding
            const parsedUrl = new URL(fileUrl);
            // Create a clean URL with properly encoded pathname
            const encodedPathname = parsedUrl.pathname.split('/')
                .map((segment, index, array) => {
                    // Don't encode the version number or other structural parts
                    if (segment.startsWith('v') && /^v\d+$/.test(segment)) return segment;
                    // Only encode the filename (last segment)
                    if (index === array.length - 1) return encodeURIComponent(segment);
                    return segment;
                })
                .join('/');
            
            // Reassemble the URL with encoded path
            parsedUrl.pathname = encodedPathname;
            fileUrl = parsedUrl.toString();
            console.log(`Encoded file URL: ${fileUrl}`);
        } catch (urlError) {
            console.error('Error encoding URL:', urlError);
            // Continue with original URL if encoding fails
        }
        
        // Redirect to Cloudinary URL
        res.redirect(fileUrl);
        
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
        
        // Delete associated files from cloudinary
        const filesToDelete = [];
        if (policy.pdfFileUrl) filesToDelete.push(policy.pdfFileUrl);
        if (policy.wordFileUrl) filesToDelete.push(policy.wordFileUrl);
        
        console.log(`Found ${filesToDelete.length} files to delete from Cloudinary`);
        
        // Delete each file from Cloudinary
        for (const fileUrl of filesToDelete) {
            try {
                console.log(`Processing file deletion for: ${fileUrl}`);
                
                // Get Cloudinary resource info (public ID and resource type)
                const { publicId, resourceType } = getCloudinaryResourceInfo(fileUrl);
                
                if (!publicId) {
                    console.error(`Could not extract public ID from URL: ${fileUrl}`);
                    continue;
                }
                
                console.log(`Attempting to delete from Cloudinary. Public ID: ${publicId}, Resource Type: ${resourceType || 'raw'}`);
                
                // Primary deletion attempt
                try {
                    const result = await cloudinary.uploader.destroy(
                        publicId, 
                        { resource_type: resourceType || 'raw' }
                    );
                    console.log(`Cloudinary deletion result for ${publicId}:`, result);
                    
                    if (result.result === 'ok') {
                        console.log(`Successfully deleted file with public ID: ${publicId}`);
                    } else {
                        throw new Error(`Cloudinary returned non-success: ${result.result}`);
                    }
                } catch (primaryError) {
                    console.error(`Primary deletion attempt failed for ${publicId}:`, primaryError.message);
                    
                    // Fallback: Try with alternative public ID formats
                    try {
                        console.log(`Trying fallback deletion approaches for ${fileUrl}`);
                        
                        // Attempt 1: Try without file extension
                        if (publicId.includes('.')) {
                            const publicIdWithoutExtension = publicId.substring(0, publicId.lastIndexOf('.'));
                            console.log(`Trying without extension: ${publicIdWithoutExtension}`);
                            
                            try {
                                const result = await cloudinary.uploader.destroy(
                                    publicIdWithoutExtension,
                                    { resource_type: resourceType || 'raw' }
                                );
                                console.log(`Fallback deletion result:`, result);
                                if (result.result === 'ok') {
                                    console.log(`Successfully deleted with fallback ID: ${publicIdWithoutExtension}`);
                                    continue; // Skip to next file
                                }
                            } catch (fallbackError) {
                                console.error(`Fallback deletion failed:`, fallbackError.message);
                            }
                        }
                        
                        // Attempt 2: Try with different resource types
                        const alternativeResourceTypes = ['raw', 'image', 'video'].filter(rt => rt !== resourceType);
                        
                        for (const altResourceType of alternativeResourceTypes) {
                            try {
                                console.log(`Trying with alternative resource type: ${altResourceType} for ID: ${publicId}`);
                                const result = await cloudinary.uploader.destroy(
                                    publicId,
                                    { resource_type: altResourceType }
                                );
                                
                                if (result.result === 'ok') {
                                    console.log(`Successfully deleted with resource type ${altResourceType}`);
                                    break; // Success, stop trying alternatives
                                }
                            } catch (altResourceError) {
                                console.error(`Failed with resource type ${altResourceType}:`, altResourceError.message);
                            }
                        }
                        
                        // Log if all fallbacks failed
                        console.log(`All deletion attempts completed for file: ${fileUrl}`);
                    } catch (fallbackError) {
                        console.error(`All fallback approaches failed:`, fallbackError.message);
                    }
                }
            } catch (fileError) {
                console.error(`Error processing file ${fileUrl}:`, fileError.message);
                // Continue to next file rather than failing the entire operation
            }
        }
        
        // Delete the policy from the database regardless of cloudinary status
        await Policy.findByIdAndDelete(id);
        console.log(`Policy ${id} deleted from database`);
        
        res.status(200).json({ message: 'Policy deleted successfully' });
    } catch (error) {
        console.error('Error in deletePolicy controller:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
