const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const config = require('../config');

/**
 * Generate a signed JWT token for a user.
 */
const signToken = (userId) => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Register a new user.
 */
const register = async ({ username, email, password }) => {
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    if (existingUser.email === email.toLowerCase()) {
      throw new AppError('An account with this email already exists.', 409);
    }
    throw new AppError('This username is already taken.', 409);
  }

  const user = await User.create({ username, email, password });
  const token = signToken(user._id);

  return { user, token };
};

/**
 * Authenticate a user with email and password.
 */
const login = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  // Update last seen
  user.lastSeen = Date.now();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);
  return { user, token };
};

/**
 * Get current authenticated user profile.
 */
const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  return user;
};

module.exports = { register, login, getMe };
