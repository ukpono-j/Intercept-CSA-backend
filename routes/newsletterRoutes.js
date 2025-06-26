const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSubscriptions,
  getNewsletterStats,
  deleteNewsletterSubscription,
} = require('../controllers/newsletterController');

// Public routes
router.post('/subscribe', subscribeNewsletter);
router.post('/unsubscribe', unsubscribeNewsletter);

// Protected routes (Admin only)
router.get('/', protect, getNewsletterSubscriptions);
router.get('/stats', protect, getNewsletterStats);
router.delete('/:id', protect, deleteNewsletterSubscription);

module.exports = router;