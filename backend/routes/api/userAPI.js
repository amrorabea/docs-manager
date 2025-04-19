const express = require('express');
const router = express.Router();
const userController = require('../../controllers/userController');
const verifyJWT = require("../../middleware/verifyJWT");

router.post('/register', verifyJWT.verifyJWT, userController.registerUser);
router.put('/update/:id', userController.updateUser);
router.get('/all', userController.getAllUsers);
router.get('/user/:id', userController.getUser);
router.delete('/delete/:id', userController.deleteUser);

module.exports = router;