const asyncHandler = require('express-async-handler');
const Newsletter = require('../models/Newsletter');
const Activity = require('../models/Activity');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
const subscribeNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  // Check if email already exists
  const existingSubscription = await Newsletter.findOne({ email: email.toLowerCase() });
  
  if (existingSubscription) {
    if (existingSubscription.status === 'active') {
      res.status(400);
      throw new Error('Email is already subscribed');
    } else {
      // Reactivate subscription
      existingSubscription.status = 'active';
      existingSubscription.subscribedAt = new Date();
      existingSubscription.unsubscribedAt = undefined;
      await existingSubscription.save();
      
      await Activity.create({
        action: 'Newsletter resubscription',
        user: email,
        type: 'newsletter',
        details: `Resubscribed to newsletter: ${email}`,
      });
      
      res.status(200).json({
        success: true,
        message: 'Successfully resubscribed to newsletter',
        data: existingSubscription,
      });
      return;
    }
  }

  // Create new subscription
  const subscription = await Newsletter.create({
    email: email.toLowerCase(),
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  });

  await Activity.create({
    action: 'Newsletter subscription',
    user: email,
    type: 'newsletter',
    details: `New newsletter subscription: ${email}`,
  });

  res.status(201).json({
    success: true,
    message: 'Successfully subscribed to newsletter',
    data: subscription,
  });
});

// @desc    Unsubscribe from newsletter
// @route   POST /api/newsletter/unsubscribe
// @access  Public
const unsubscribeNewsletter = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Email is required');
  }

  const subscription = await Newsletter.findOne({ email: email.toLowerCase() });

  if (!subscription) {
    res.status(404);
    throw new Error('Email not found in subscription list');
  }

  subscription.status = 'unsubscribed';
  subscription.unsubscribedAt = new Date();
  await subscription.save();

  await Activity.create({
    action: 'Newsletter unsubscription',
    user: email,
    type: 'newsletter',
    details: `Unsubscribed from newsletter: ${email}`,
  });

  res.json({
    success: true,
    message: 'Successfully unsubscribed from newsletter',
  });
});

// @desc    Get all newsletter subscriptions (Admin only)
// @route   GET /api/newsletter
// @access  Private/Admin
const getNewsletterSubscriptions = asyncHandler(async (req, res) => {
  const { search, status, sortBy, page = 1, limit = 50 } = req.query;

  const query = {};
  
  if (search) {
    query.email = { $regex: search, $options: 'i' };
  }
  
  if (status && status !== 'all') {
    query.status = status;
  }

  let sortOptions = {};
  switch (sortBy) {
    case 'email':
      sortOptions = { email: 1 };
      break;
    case 'date':
      sortOptions = { subscribedAt: -1 };
      break;
    case 'status':
      sortOptions = { status: 1 };
      break;
    default:
      sortOptions = { subscribedAt: -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const subscriptions = await Newsletter.find(query)
    .sort(sortOptions)
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Newsletter.countDocuments(query);
  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    success: true,
    data: subscriptions,
    pagination: {
      current: parseInt(page),
      pages: totalPages,
      total,
      limit: parseInt(limit),
    },
  });
});

// @desc    Get newsletter stats (Admin only)
// @route   GET /api/newsletter/stats
// @access  Private/Admin
const getNewsletterStats = asyncHandler(async (req, res) => {
  const totalSubscriptions = await Newsletter.countDocuments();
  const activeSubscriptions = await Newsletter.countDocuments({ status: 'active' });
  const unsubscribed = await Newsletter.countDocuments({ status: 'unsubscribed' });

  // Get recent subscriptions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSubscriptions = await Newsletter.countDocuments({
    subscribedAt: { $gte: thirtyDaysAgo },
    status: 'active',
  });

  res.json({
    success: true,
    stats: {
      total: totalSubscriptions,
      active: activeSubscriptions,
      unsubscribed,
      recent: recentSubscriptions,
    },
  });
});

// @desc    Delete newsletter subscription (Admin only)
// @route   DELETE /api/newsletter/:id
// @access  Private/Admin
const deleteNewsletterSubscription = asyncHandler(async (req, res) => {
  const subscription = await Newsletter.findById(req.params.id);

  if (!subscription) {
    res.status(404);
    throw new Error('Subscription not found');
  }

  await Activity.create({
    action: 'Newsletter subscription deleted',
    user: subscription.email,
    type: 'newsletter',
    details: `Deleted newsletter subscription: ${subscription.email}`,
  });

  await subscription.deleteOne();

  res.json({
    success: true,
    message: 'Subscription deleted successfully',
  });
});

module.exports = {
  subscribeNewsletter,
  unsubscribeNewsletter,
  getNewsletterSubscriptions,
  getNewsletterStats,
  deleteNewsletterSubscription,
};