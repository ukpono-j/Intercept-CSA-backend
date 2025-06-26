const asyncHandler = require('express-async-handler');
const Resource = require('../models/resource');
const Activity = require('../models/Activity');

// @desc    Get all resources
// @route   GET /api/resources
// @access  Public
const getResources = asyncHandler(async (req, res) => {
  const { type, page = 1, limit = 12 } = req.query;

  const query = {};
  if (type && type !== 'all') {
    query.type = type;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const resources = await Resource.find(query)
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Resource.countDocuments(query);
  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    success: true,
    data: resources,
    pagination: {
      current: parseInt(page),
      pages: totalPages,
      total,
      limit: parseInt(limit),
    },
  });
});

// @desc    Create a new resource
// @route   POST /api/resources
// @access  Private/Admin
const createResource = asyncHandler(async (req, res) => {
  const { title, description, type, url, thumbnail } = req.body;

  if (!title || !description || !type || !url) {
    res.status(400);
    throw new Error('Title, description, type, and URL are required');
  }

  const resource = await Resource.create({
    title,
    description,
    type,
    url,
    thumbnail,
    createdBy: req.user._id, // Assumes req.user is set by protect middleware
  });

  await Activity.create({
    action: 'Resource created',
    user: req.user.email,
    type: 'resource',
    details: `New resource created: ${title}`,
  });

  res.status(201).json({
    success: true,
    message: 'Resource created successfully',
    data: resource,
  });
});

module.exports = { getResources, createResource };