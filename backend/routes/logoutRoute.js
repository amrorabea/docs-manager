const express = require('express');
const router = express.Router();
const logoutController = require('../controllers/logoutController');

router.get('/handleLogout', logoutController.handleLogout);

module.exports = router;