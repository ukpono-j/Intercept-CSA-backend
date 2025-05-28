const asyncHandler = require('express-async-handler');
const Blog = require('../models/Blog');
const Activity = require('../models/Activity');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');

// Configure upload directory
const uploadDir = path.join(__dirname, '..', 'Uploads');

// Ensure Uploads directory exists
let uploadDirInitialized = false;
const ensureUploadsDir = async () => {
  if (uploadDirInitialized) return;
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log('Uploads directory verified/created');
    uploadDirInitialized = true;
  } catch (err) {
    console.error('Error creating Uploads directory:', err);
    throw new Error('Failed to initialize upload directory');
  }
};

ensureUploadsDir().catch(console.error);

// Configure Multer
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      if (!uploadDirInitialized) await ensureUploadsDir();
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG or PNG images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
});

const cleanupFile = async (filename) => {
  if (!filename) return;
  try {
    await fs.unlink(path.join(uploadDir, filename));
    console.log(`Cleaned up file: ${filename}`);
  } catch (err) {
    console.error(`Error cleaning up file ${filename}:`, err);
  }
};

// @desc    Get all blog posts
// @route   GET /api/blogs
// @access  Public for status=published, Private/Admin otherwise
const getBlogs = asyncHandler(async (req, res) => {
  console.log('Received GET /api/blogs request', req.query);
  try {
    const { search, status, sortBy } = req.query;
    const query = {};

    if (status === 'published') {
      query.status = 'published';
    } else if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'title') {
      sortOptions = { title: 1 };
    } else if (sortBy === 'views') {
      sortOptions = { views: -1 };
    }

    const blogs = await Blog.find(query)
      .populate('author', 'name')
      .populate('comments.user', 'name')
      .sort(sortOptions)
      .lean();

    console.log(`Found ${blogs.length} blogs`);
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ message: 'Server error fetching blogs' });
  }
});

// @desc    Get blog post by ID
// @route   GET /api/blogs/:id
// @access  Private/Admin
const getBlogById = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'name')
      .populate('comments.user', 'name');

    if (!blog) {
      res.status(404);
      throw new Error('Blog post not found');
    }

    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ message: error.message || 'Server error fetching blog post' });
  }
});

// @desc    Create blog post
// @route   POST /api/blogs
// @access  Private/Admin
const createBlog = asyncHandler(async (req, res) => {
  try {
    console.log('Creating blog with data:', req.body, req.file);
    const { title, excerpt, content, category, tags, status, featured, scheduledAt, author } = req.body;

    if (!title || !content || !author) {
      if (req.file) await cleanupFile(req.file.filename);
      res.status(400);
      throw new Error('Title, content, and author are required');
    }

    if (!mongoose.Types.ObjectId.isValid(author)) {
      if (req.file) await cleanupFile(req.file.filename);
      res.status(400);
      throw new Error('Invalid author ID format');
    }

    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch (err) {
        console.error('Error parsing tags:', err);
      }
    }

    if (status === 'scheduled') {
      if (!scheduledAt) {
        if (req.file) await cleanupFile(req.file.filename);
        res.status(400);
        throw new Error('Schedule date is required for scheduled posts');
      }
      if (new Date(scheduledAt) <= new Date()) {
        if (req.file) await cleanupFile(req.file.filename);
        res.status(400);
        throw new Error('Schedule date must be in the future');
      }
    }

    const blogData = {
      title,
      excerpt,
      content,
      category,
      tags: parsedTags,
      status: status || 'draft',
      featured: featured === 'true' || featured === true,
      author,
      scheduledAt: status === 'scheduled' && scheduledAt ? new Date(scheduledAt) : null,
      image: req.file ? `/Uploads/${req.file.filename}` : ''
    };

    const blog = await Blog.create(blogData);

    await Activity.create({
      action: `Blog post ${blog.status === 'published' ? 'published' : 'created'}`,
      user: req.user?.name || author,
      type: 'blog',
      details: `Blog: ${blog.title}`
    });

    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    if (req.file) await cleanupFile(req.file.filename);
    res.status(error.status || 500).json({ message: error.message || 'Server error creating blog post' });
  }
});

// @desc    Update blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
const updateBlog = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      if (req.file) await cleanupFile(req.file.filename);
      res.status(404);
      throw new Error('Blog post not found');
    }

    const oldImage = blog.image;
    const updates = {
      title: req.body.title || blog.title,
      excerpt: req.body.excerpt || blog.excerpt,
      content: req.body.content || blog.content,
      category: req.body.category || blog.category,
      status: req.body.status || blog.status,
      featured: req.body.featured === 'true' || req.body.featured === true || blog.featured,
      image: req.file ? `/Uploads/${req.file.filename}` : blog.image,
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : blog.scheduledAt
    };

    if (req.body.tags) {
      try {
        updates.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (err) {
        console.error('Error parsing tags:', err);
        updates.tags = blog.tags;
      }
    } else {
      updates.tags = blog.tags;
    }

    if (updates.status === 'scheduled' && !updates.scheduledAt) {
      if (req.file) await cleanupFile(req.file.filename);
      res.status(400);
      throw new Error('Schedule date is required for scheduled posts');
    }

    Object.assign(blog, updates);
    const updatedBlog = await blog.save();

    if (req.file && oldImage) {
      await cleanupFile(oldImage.replace('/Uploads/', ''));
    }

    await Activity.create({
      action: `Blog post ${updates.status === 'published' ? 'published' : 'updated'}`,
      user: req.user?.name || req.user?._id,
      type: 'blog',
      details: `Blog: ${blog.title}`
    });

    res.json(updatedBlog);
  } catch (error) {
    console.error('Error updating blog:', error);
    if (req.file) await cleanupFile(req.file.filename);
    res.status(500).json({ message: error.message || 'Server error updating blog post' });
  }
});

// @desc    Delete blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
const deleteBlog = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      res.status(404);
      throw new Error('Blog post not found');
    }

    if (blog.image) {
      await cleanupFile(blog.image.replace('/Uploads/', ''));
    }

    await blog.deleteOne();

    await Activity.create({
      action: 'Blog post deleted',
      user: req.user?.name || req.user?._id,
      type: 'blog',
      details: `Blog: ${blog.title}`
    });

    res.json({ message: 'Blog post removed' });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ message: error.message || 'Server error deleting blog post' });
  }
});

// @desc    Create comment on blog post
// @route   POST /api/blogs/:id/comments
// @access  Private
const createComment = asyncHandler(async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400);
      throw new Error('Comment text is required');
    }

    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      res.status(404);
      throw new Error('Blog post not found');
    }

    const comment = {
      user: req.user._id,
      text,
      createdAt: Date.now()
    };

    blog.comments.push(comment);
    await blog.save();

    await Activity.create({
      action: 'Comment received',
      user: req.user.name || req.user._id,
      type: 'comment',
      details: text.substring(0, 50)
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: error.message || 'Server error adding comment' });
  }
});

// @desc    Delete comment on blog post
// @route   DELETE /api/blogs/:id/comments/:commentId
// @access  Private/Admin
const deleteComment = asyncHandler(async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      res.status(404);
      throw new Error('Blog post not found');
    }

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) {
      res.status(404);
      throw new Error('Comment not found');
    }

    await Activity.create({
      action: 'Comment deleted',
      user: req.user.name || req.user._id,
      type: 'comment',
      details: comment.text.substring(0, 50)
    });

    blog.comments.id(req.params.commentId).deleteOne();
    await blog.save();

    res.json({ message: 'Comment removed' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ message: error.message || 'Server error deleting comment' });
  }
});

module.exports = {
  getBlogs,
  getBlogById,
  createBlog: [upload.single('image'), createBlog],
  updateBlog: [upload.single('image'), updateBlog],
  deleteBlog,
  createComment,
  deleteComment,
  upload
};