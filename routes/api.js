const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { requireAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { cacheMiddleware } = require('../utils/cache');

// Rate limit all API routes
router.use(apiLimiter);

// Enforce authentication on all API routes
router.use(requireAuth);

// Caching on high-throughput read routes with automatic TTL
router.get('/notes/search', cacheMiddleware(30), apiController.searchNotes);
router.get('/subjects', cacheMiddleware(120), apiController.getSubjects);
router.get('/stats', cacheMiddleware(60), apiController.getStats);

module.exports = router;
