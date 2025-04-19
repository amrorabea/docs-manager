const express = require('express');
const router = express.Router();
const refreshTokenController = require('../controllers/refreshController');

router.get('/handleRefreshToken', refreshTokenController.handleRefreshToken);

module.exports = router;