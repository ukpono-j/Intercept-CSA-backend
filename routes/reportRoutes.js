const express = require('express');
const router = express.Router();
const { createReport, getReports } = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .post(createReport)
  .get(protect, admin, getReports);

module.exports = router;