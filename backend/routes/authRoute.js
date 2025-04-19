const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/handleLogin', authController.handleLogin);

module.exports = router;