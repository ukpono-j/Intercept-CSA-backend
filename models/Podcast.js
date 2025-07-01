const mongoose = require('mongoose');

const podcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  excerpt: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required'],
  },
  category: {
    type: String,
    enum: ['advocacy', 'survivor-stories', 'prevention', 'education', 'community', ''],
    default: '',
  },
  tags: {
    type: [String],
    default: [],
  },
  image: {
    type: String,
    default: '',
  },
  audioUrl: {
    type: String,
    default: '',
  },
  duration: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'draft',
  },
  featured: {
    type: Boolean,
    default: false,
  },
  views: {
    type: Number,
    default: 0,
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt before saving
podcastSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Podcast', podcastSchema);