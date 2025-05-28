
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.route('/')
  .get(protect, getUsers)
  .post(protect, createUser);

router.route('/:id')
  .get(protect, getUserById)
  .put(protect, updateUser)
  .delete(protect, deleteUser);

module.exports = router;