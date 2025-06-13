const express = require('express');
const router = express.Router();
const { createReport, getReports, markReportAsRead } = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(createReport)
  .get(protect, admin, getReports);

router.route('/:id/read')
  .patch(protect, admin, markReportAsRead);

module.exports = router;