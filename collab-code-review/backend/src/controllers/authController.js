const authService = require('../services/authService');

/**
 * @desc   Register new user
 * @route  POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const { user, token } = await authService.register({ username, email, password });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Login user
 * @route  POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user, token },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get current authenticated user
 * @route  GET /api/auth/me
 * @access Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Logout (client-side token invalidation hint)
 * @route  POST /api/auth/logout
 * @access Private
 */
const logout = (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

module.exports = { register, login, getMe, logout };
