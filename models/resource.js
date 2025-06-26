const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  type: {
    type: String,
    enum: ['podcast', 'article', 'video', 'guide'],
    required: [true, 'Resource type is required'],
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, 'Please enter a valid URL'],
  },
  thumbnail: {
    type: String,
    trim: true,
    match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, 'Please enter a valid thumbnail URL'],
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required'],
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
resourceSchema.index({ type: 1 });
resourceSchema.index({ publishedAt: -1 });

module.exports = mongoose.model('Resource', resourceSchema);
