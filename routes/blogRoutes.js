const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getBlogs, getBlogById, createBlog, updateBlog, deleteBlog, createComment, deleteComment } = require('../controllers/blogController');

// Public route for published blogs
router.get('/', async (req, res, next) => {
  if (req.query.status === 'published') {
    return getBlogs(req, res); // No authentication required
  }
  protect(req, res, next); // Auth required for other queries
}, getBlogs);

// Protected routes
router.post('/', protect, createBlog);
router.get('/:id', protect, getBlogById);
router.put('/:id', protect, updateBlog);
router.delete('/:id', protect, deleteBlog);
router.post('/:id/comments', protect, createComment);
router.delete('/:id/comments/:commentId', protect, deleteComment);

module.exports = router;