const express = require('express');
const router = express.Router();
const { registerAdmin, registerUser, loginAdmin, loginUser } = require('../controllers/authController');

// Public routes
router.post('/register', registerAdmin);
router.post('/register-user', registerUser);
router.post('/login', loginAdmin);
router.post('/login-user', loginUser);

module.exports = router;