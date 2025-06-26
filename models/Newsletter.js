const mongoose = require('mongoose');

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  status: {
    type: String,
    enum: ['active', 'unsubscribed'],
    default: 'active',
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  unsubscribedAt: {
    type: Date,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  source: {
    type: String,
    default: 'website',
  },
}, {
  timestamps: true,
});

// Index for better query performance
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ status: 1 });
newsletterSchema.index({ subscribedAt: -1 });

module.exports = mongoose.model('Newsletter', newsletterSchema);