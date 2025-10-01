const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getPodcasts, getPodcastById, createPodcast, updatePodcast, deletePodcast } = require('../controllers/podcastController');

// Public route for published podcasts
router.get('/', async (req, res, next) => {
  if (req.query.status === 'published') {
    return getPodcasts(req, res); // No authentication required
  }
  protect(req, res, next); // Auth required for other queries
}, getPodcasts);

// Protected routes with better multer error handling
router.post('/', protect, (req, res, next) => {
  createPodcast[0](req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Unexpected field or too many files.' });
      } else {
        return res.status(400).json({ message: err.message });
      }
    }
    next();
  });
}, createPodcast[1]);

router.get('/:id', protect, getPodcastById);

router.put('/:id', protect, (req, res, next) => {
  updatePodcast[0](req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 50MB.' });
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Unexpected field or too many files.' });
      } else {
        return res.status(400).json({ message: err.message });
      }
    }
    next();
  });
}, updatePodcast[1]);

router.delete('/:id', protect, deletePodcast);

module.exports = router;