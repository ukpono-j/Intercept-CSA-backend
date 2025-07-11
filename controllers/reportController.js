const Report = require('../models/Report');
const asyncHandler = require('express-async-handler');

// @desc    Create a new report
// @route   POST /api/reports
// @access  Public
const createReport = asyncHandler(async (req, res) => {
  const { name, email, message, isAnonymous } = req.body;

  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const report = await Report.create({
    name: isAnonymous ? null : name,
    email: isAnonymous ? null : email,
    message,
    isAnonymous,
  });

  res.status(201).json(report);
});

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private/Admin
const getReports = asyncHandler(async (req, res) => {
  const reports = await Report.find({}).sort({ createdAt: -1 });
  res.json(reports);
});

// @desc    Mark a report as read
// @route   PATCH /api/reports/:id/read
// @access  Private/Admin
const markReportAsRead = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    res.status(404);
    throw new Error('Report not found');
  }

  report.isRead = true;
  await report.save();

  res.json(report);
});

module.exports = {
  createReport,
  getReports,
  markReportAsRead,
};