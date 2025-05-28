const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded JWT payload:', decoded); // Debug log
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user || req.user.role !== 'admin') {
        console.log('Authorization failed:', { user: req.user, role: req.user?.role }); // Debug log
        res.status(401);
        throw new Error('Not authorized, admin access required');
      }
      
      console.log('Authorized user:', { id: req.user._id, name: req.user.name }); // Debug log
      next();
    } catch (error) {
      console.error('Token verification error:', error.message); // Debug log
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

module.exports = { protect };