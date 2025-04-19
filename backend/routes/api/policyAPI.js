const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policyController');

// @desc    Create a new policy
// @route   POST /api/policies
// @access  Public
router.post('/create', policyController.createPolicy);

// @desc    Get all policies (supports filtering by departmentId)
// @route   GET /api/policies
// @access  Public
router.get('/all', policyController.getPolicies);

// @desc    Get a single policy by id
// @route   GET /api/policies/:id
// @access  Public
router.get('/policy/:id', policyController.getPolicy);

// @desc    Update a policy by id
// @route   PUT /api/policies/:id
// @access  Public
router.put('/update/:id', policyController.updatePolicy);

// @desc    Delete a policy by id
// @route   DELETE /api/policies/:id
// @access  Public
router.delete('/delete/:id', policyController.deletePolicy);

module.exports = router;
