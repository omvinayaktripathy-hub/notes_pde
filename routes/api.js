const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

router.get('/notes/search', apiController.searchNotes);
router.get('/subjects', apiController.getSubjects);
router.get('/stats', apiController.getStats);

module.exports = router;
