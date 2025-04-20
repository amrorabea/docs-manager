const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policyController');
const { policyUpload, handleUploadErrors } = require('../../middleware/uploadMiddleware');

// @desc    Create a new policy
// @route   POST /api/policies/create
// @access  Public
router.post('/create', policyUpload, handleUploadErrors, policyController.createPolicy);

// @desc    Get all policies (supports filtering by departmentId)
// @route   GET /api/policies/all
// @access  Public
router.get('/all', policyController.getPolicies);

// @desc    Search policies
// @route   GET /api/policies/search
// @access  Public
router.get('/search', policyController.searchPolicies);

// @desc    Get policy statistics
// @route   GET /api/policies/stats
// @access  Public
router.get('/stats', policyController.getPolicyStats);

// @desc    Get a single policy by id
// @route   GET /api/policies/policy/:id
// @access  Public
router.get('/policy/:id', policyController.getPolicy);

// @desc    Download policy file
// @route   GET /api/policies/download/:id/:fileType
// @access  Public
router.get('/download/:id/:fileType', policyController.downloadPolicyFile);

// @desc    Update policy statuses
// @route   POST /api/policies/update-statuses
// @access  Admin
router.post('/update-statuses', policyController.updatePolicyStatuses);

// @desc    Update a policy by id
// @route   PUT /api/policies/update/:id
// @access  Public
router.put('/update/:id', policyUpload, handleUploadErrors, policyController.updatePolicy);

// @desc    Delete a policy by id
// @route   DELETE /api/policies/delete/:id
// @access  Public
router.delete('/delete/:id', policyController.deletePolicy);

module.exports = router;
