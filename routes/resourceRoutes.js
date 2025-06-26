const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getResources, createResource } = require('../controllers/resourceController');

// Public routes
router.get('/', getResources);

// Protected routes (Admin only)
router.post('/', protect, createResource);

module.exports = router;