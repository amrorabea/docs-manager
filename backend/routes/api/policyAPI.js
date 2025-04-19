const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/policyController');

// @desc    Create a new policy
// @route   POST /api/policies
// @access  Public
router.post('/', policyController.createPolicy);

// @desc    Get all policies (supports filtering by departmentId)
// @route   GET /api/policies
// @access  Public
router.get('/', policyController.getPolicies);

// @desc    Get a single policy by id
// @route   GET /api/policies/:id
// @access  Public
router.get('/:id', policyController.getPolicy);

// @desc    Update a policy by id
// @route   PUT /api/policies/:id
// @access  Public
router.put('/:id', policyController.updatePolicy);

// @desc    Delete a policy by id
// @route   DELETE /api/policies/:id
// @access  Public
router.delete('/:id', policyController.deletePolicy);

module.exports = router;
