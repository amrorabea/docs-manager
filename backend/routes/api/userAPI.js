const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const verifyJWT = require("../../middleware/verifyJWT");

// @desc    Register a user
// @route   POST /api/users/register
// @access  Public (or you can set it to Private if authentication is needed)
router.post('/register', userController.registerUser);

// @desc    Update a user
// @route   PUT /api/users/update/:id
// @access  Private (authentication required)
router.put('/update/:id', verifyJWT.verifyJWT, userController.updateUser);

// @desc    Get all users
// @route   GET /api/users/all
// @access  Private (authentication required)
router.get('/all', verifyJWT.verifyJWT, userController.getAllUsers);

// @desc    Get a single user
// @route   GET /api/users/user/:email
// @access  Private (authentication required)
router.get('/user/:email', verifyJWT.verifyJWT, userController.getUser);

// @desc    Delete a user
// @route   DELETE /api/users/delete/:id
// @access  Private (authentication required)
router.delete('/delete/:id', verifyJWT.verifyJWT, userController.deleteUser);

module.exports = router;
