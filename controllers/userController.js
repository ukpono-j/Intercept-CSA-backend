const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Activity = require('../models/Activity');

// @desc    Get all registrations
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { search, status, sortBy } = req.query;

  const query = { role: 'user' };
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (status && status !== 'all') {
    query.status = status;
  }

  let sortOptions = {};
  switch (sortBy) {
    case 'name':
      sortOptions = { name: 1 };
      break;
    case 'date':
      sortOptions = { registeredDate: -1 };
      break;
    case 'spent':
      sortOptions = { totalSpent: -1 };
      break;
    default:
      sortOptions = { name: 1 };
  }

  const users = await User.find(query).sort(sortOptions);
  res.json(users);
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user && user.role === 'user') {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
const createUser = asyncHandler(async (req, res) => {
  const { name, email, phone, location, package, status, totalSpent, avatar } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    name,
    email,
    phone,
    location,
    package,
    status,
    totalSpent,
    avatar,
    password: 'defaultPassword123', // Should be handled securely in production
    role: 'user',
  });

  if (user) {
    await Activity.create({
      action: 'New user registration',
      user: email,
      type: 'user',
    });
    res.status(201).json(user);
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user && user.role === 'user') {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.location = req.body.location || user.location;
    user.package = req.body.package || user.package;
    user.status = req.body.status || user.status;
    user.totalSpent = req.body.totalSpent || user.totalSpent;
    user.avatar = req.body.avatar || user.avatar;
    user.lastActivity = Date.now();

    const updatedUser = await user.save();
    await Activity.create({
      action: 'User updated',
      user: user.email,
      type: 'user',
    });
    res.json(updatedUser);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user && user.role === 'user') {
    await Activity.create({
      action: 'User deleted',
      user: user.email,
      type: 'user',
    });
    await user.remove();
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };