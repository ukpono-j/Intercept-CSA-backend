const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
  },
  user: {
    type: String, // Stores user email or post title for simplicity
    required: [true, 'User or entity is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['user', 'blog', 'comment', 'newsletter', 'resource'],
    required: [true, 'Type is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Activity', activitySchema);