const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policyController');
const { policyUpload, handleUploadErrors } = require('../../middleware/uploadMiddleware');
const { verifyJWT } = require('../../middleware/verifyJWT');
const { verifyAdmin } = require('../../middleware/verifyAdmin');

// @desc    Create a new policy
// @route   POST /api/policies/create
// @access  Admin only
router.post('/create', verifyJWT, verifyAdmin, policyUpload, handleUploadErrors, policyController.createPolicy);

// @desc    Get all policies (supports filtering by department)
// @route   GET /api/policies/all
// @access  Authenticated users
router.get('/all', verifyJWT, policyController.getPolicies);

// @desc    Search policies
// @route   GET /api/policies/search
// @access  Authenticated users
router.get('/search', verifyJWT, policyController.searchPolicies);

// @desc    Search policy content
// @route   GET /api/policies/content-search
// @access  Authenticated users
router.get('/content-search', verifyJWT, policyController.searchPolicyContent);

// @desc    Get policy statistics
// @route   GET /api/policies/stats
// @access  Authenticated users
router.get('/stats', verifyJWT, policyController.getPolicyStats);

// @desc    Get a single policy by id
// @route   GET /api/policies/policy/:id
// @access  Authenticated users
router.get('/policy/:id', verifyJWT, policyController.getPolicy);

// @desc    Download policy file
// @route   GET /api/policies/download/:id/:fileType
// @access  Authenticated users
router.get('/download/:id/:fileType', verifyJWT, policyController.downloadPolicyFile);

// @desc    Update policy statuses
// @route   POST /api/policies/update-statuses
// @access  Admin only
router.post('/update-statuses', verifyJWT, verifyAdmin, policyController.updatePolicyStatuses);

// @desc    Update a policy by id
// @route   PUT /api/policies/update/:id
// @access  Admin only
router.put('/update/:id', verifyJWT, verifyAdmin, policyUpload, handleUploadErrors, policyController.updatePolicy);

// @desc    Delete a policy by id
// @route   DELETE /api/policies/delete/:id
// @access  Admin only
router.delete('/delete/:id', verifyJWT, verifyAdmin, policyController.deletePolicy);

module.exports = router;
