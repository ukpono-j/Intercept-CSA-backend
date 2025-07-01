const asyncHandler = require('express-async-handler');
const Podcast = require('../models/Podcast');
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
    uploadDirInitialized = true;
  } catch (err) {
    console.error('Error creating Uploads directory:', err);
    throw new Error('Failed to initialize upload directory');
  }
};

ensureUploadsDir().catch(console.error);

// Configure Multer for images
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
  const filetypes = /jpeg|jpg|png|mp3/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG images, or MP3 audio files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 2 } // Allow larger files for audio
});

const cleanupFile = async (filename) => {
  if (!filename) return;
  try {
    await fs.unlink(path.join(uploadDir, filename));
  } catch (err) {
    console.error(`Error cleaning up file ${filename}:`, err);
  }
};

// @desc    Get all podcast episodes
// @route   GET /api/podcasts
// @access  Public for status=published, Private/Admin otherwise
const getPodcasts = asyncHandler(async (req, res) => {
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
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (sortBy === 'title') {
      sortOptions = { title: 1 };
    } else if (sortBy === 'views') {
      sortOptions = { views: -1 };
    }

    const podcasts = await Podcast.find(query)
      .populate('author', 'name')
      .sort(sortOptions)
      .lean();

    res.json(podcasts);
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    res.status(500).json({ message: 'Server error fetching podcasts' });
  }
});

// @desc    Get podcast episode by ID
// @route   GET /api/podcasts/:id
// @access  Private/Admin
const getPodcastById = asyncHandler(async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id)
      .populate('author', 'name');

    if (!podcast) {
      res.status(404);
      throw new Error('Podcast episode not found');
    }

    podcast.views = (podcast.views || 0) + 1;
    await podcast.save();

    res.json(podcast);
  } catch (error) {
    console.error('Error fetching podcast:', error);
    res.status(500).json({ message: error.message || 'Server error fetching podcast episode' });
  }
});

// @desc    Create podcast episode
// @route   POST /api/podcasts
// @access  Private/Admin
const createPodcast = asyncHandler(async (req, res) => {
  try {
    const { title, excerpt, description, category, tags, status, featured, scheduledAt, author, duration } = req.body;

    if (!title || !description || !author) {
      if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
      if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
      res.status(400);
      throw new Error('Title, description, and author are required');
    }

    if (!mongoose.Types.ObjectId.isValid(author)) {
      if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
      if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
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
        if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
        if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
        res.status(400);
        throw new Error('Schedule date is required for scheduled posts');
      }
      if (new Date(scheduledAt) <= new Date()) {
        if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
        if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
        res.status(400);
        throw new Error('Schedule date must be in the future');
      }
    }

    const podcastData = {
      title,
      excerpt,
      description,
      category,
      tags: parsedTags,
      status: status || 'draft',
      featured: featured === 'true' || featured === true,
      author,
      scheduledAt: status === 'scheduled' && scheduledAt ? new Date(scheduledAt) : null,
      image: req.files?.image?.[0] ? `/Uploads/${req.files.image[0].filename}` : '',
      audioUrl: req.files?.audio?.[0] ? `/Uploads/${req.files.audio[0].filename}` : '',
      duration: duration || '',
    };

    const podcast = await Podcast.create(podcastData);

    await Activity.create({
      action: `Podcast episode ${podcast.status === 'published' ? 'published' : 'created'}`,
      user: req.user?.name || author,
      type: 'podcast',
      details: `Podcast: ${podcast.title}`
    });

    res.status(201).json(podcast);
  } catch (error) {
    console.error('Error creating podcast:', error);
    if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
    if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
    res.status(error.status || 500).json({ message: error.message || 'Server error creating podcast episode' });
  }
});

// @desc    Update podcast episode
// @route   PUT /api/podcasts/:id
// @access  Private/Admin
const updatePodcast = asyncHandler(async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) {
      if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
      if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
      res.status(404);
      throw new Error('Podcast episode not found');
    }

    const oldImage = podcast.image;
    const oldAudio = podcast.audioUrl;
    const updates = {
      title: req.body.title || podcast.title,
      excerpt: req.body.excerpt || podcast.excerpt,
      description: req.body.description || podcast.description,
      category: req.body.category || podcast.category,
      status: req.body.status || podcast.status,
      featured: req.body.featured === 'true' || req.body.featured === true || podcast.featured,
      image: req.files?.image?.[0] ? `/Uploads/${req.files.image[0].filename}` : podcast.image,
      audioUrl: req.files?.audio?.[0] ? `/Uploads/${req.files.audio[0].filename}` : podcast.audioUrl,
      duration: req.body.duration || podcast.duration,
      scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : podcast.scheduledAt
    };

    if (req.body.tags) {
      try {
        updates.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (err) {
        console.error('Error parsing tags:', err);
        updates.tags = podcast.tags;
      }
    } else {
      updates.tags = podcast.tags;
    }

    if (updates.status === 'scheduled' && !updates.scheduledAt) {
      if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
      if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
      res.status(400);
      throw new Error('Schedule date is required for scheduled posts');
    }

    Object.assign(podcast, updates);
    const updatedPodcast = await podcast.save();

    if (req.files?.image?.[0] && oldImage) {
      await cleanupFile(oldImage.replace('/Uploads/', ''));
    }
    if (req.files?.audio?.[0] && oldAudio) {
      await cleanupFile(oldAudio.replace('/Uploads/', ''));
    }

    await Activity.create({
      action: `Podcast episode ${updates.status === 'published' ? 'published' : 'updated'}`,
      user: req.user?.name || req.user?._id,
      type: 'podcast',
      details: `Podcast: ${podcast.title}`
    });

    res.json(updatedPodcast);
  } catch (error) {
    console.error('Error updating podcast:', error);
    if (req.files?.image?.[0]) await cleanupFile(req.files.image[0].filename);
    if (req.files?.audio?.[0]) await cleanupFile(req.files.audio[0].filename);
    res.status(500).json({ message: error.message || 'Server error updating podcast episode' });
  }
});

// @desc    Delete podcast episode
// @route   DELETE /api/podcasts/:id
// @access  Private/Admin
const deletePodcast = asyncHandler(async (req, res) => {
  try {
    const podcast = await Podcast.findById(req.params.id);
    if (!podcast) {
      res.status(404);
      throw new Error('Podcast episode not found');
    }

    if (podcast.image) {
      await cleanupFile(podcast.image.replace('/Uploads/', ''));
    }
    if (podcast.audioUrl) {
      await cleanupFile(podcast.audioUrl.replace('/Uploads/', ''));
    }

    await podcast.deleteOne();

    await Activity.create({
      action: 'Podcast episode deleted',
      user: req.user?.name || req.user?._id,
      type: 'podcast',
      details: `Podcast: ${podcast.title}`
    });

    res.json({ message: 'Podcast episode removed' });
  } catch (error) {
    console.error('Error deleting podcast:', error);
    res.status(500).json({ message: error.message || 'Server error deleting podcast episode' });
  }
});

module.exports = {
  getPodcasts,
  getPodcastById,
  createPodcast: [upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), createPodcast],
  updatePodcast: [upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), updatePodcast],
  deletePodcast,
  upload
};