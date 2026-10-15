const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { requireAuth } = require('../middleware/auth');

// Secure private file download endpoint
router.get('/download/:id', requireAuth, fileController.downloadNote);

module.exports = router;
