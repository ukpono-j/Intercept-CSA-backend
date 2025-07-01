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

// Protected routes
router.post('/', protect, createPodcast);
router.get('/:id', protect, getPodcastById);
router.put('/:id', protect, updatePodcast);
router.delete('/:id', protect, deletePodcast);

module.exports = router;