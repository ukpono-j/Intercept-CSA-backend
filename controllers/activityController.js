const asyncHandler = require('express-async-handler');
const Activity = require('../models/Activity');

// @desc    Get recent activities
// @route   GET /api/activities
// @access  Private/Admin
const getActivities = asyncHandler(async (req, res) => {
  const activities = await Activity.find()
    .sort({ createdAt: -1 })
    .limit(10); // Limit to 10 recent activities
  res.json(activities);
});

module.exports = { getActivities };