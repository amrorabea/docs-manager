const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const { verifyJWT } = require("../../middleware/verifyJWT");
const { verifyAdmin } = require("../../middleware/verifyAdmin");

// @desc    Register a user
// @route   POST /api/users/register
// @access  Public (or you can set it to Private if authentication is needed)
router.post('/register', userController.registerUser);

// @desc    Update a user
// @route   PUT /api/users/update/:id
// @access  Private (authentication required)
// Users should only update their own profiles unless they're admin
router.put('/update/:id', verifyJWT, userController.updateUser);

// @desc    Get all users
// @route   GET /api/users/all
// @access  Admin only
router.get('/all', verifyJWT, verifyAdmin, userController.getAllUsers);

// @desc    Get a single user
// @route   GET /api/users/user/:email
// @access  Private (authentication required)
// Users should only access their own profile unless they're admin
router.get('/user/:email', verifyJWT, userController.getUser);

// @desc    Delete a user
// @route   DELETE /api/users/delete/:id
// @access  Admin only
router.delete('/delete/:id', verifyJWT, verifyAdmin, userController.deleteUser);

module.exports = router;
