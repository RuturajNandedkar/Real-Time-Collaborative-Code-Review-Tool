const sessionService = require('../services/sessionService');

/**
 * @desc   Create a new review session
 * @route  POST /api/sessions
 * @access Private
 */
const createSession = async (req, res, next) => {
  try {
    const { title, language, code } = req.body;
    const session = await sessionService.createSession({
      title,
      language,
      code,
      userId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Session created successfully.',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get a session by its UUID sessionId
 * @route  GET /api/sessions/:sessionId
 * @access Private
 */
const getSessionById = async (req, res, next) => {
  try {
    const session = await sessionService.getSessionById(
      req.params.sessionId,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all sessions for the authenticated user
 * @route  GET /api/sessions
 * @access Private
 */
const getUserSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.getUserSessions(req.user._id);

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Join a session as a participant
 * @route  POST /api/sessions/:sessionId/join
 * @access Private
 */
const joinSession = async (req, res, next) => {
  try {
    const { role } = req.body;
    const session = await sessionService.joinSession(
      req.params.sessionId,
      req.user._id,
      role
    );

    res.status(200).json({
      success: true,
      message: 'Joined session successfully.',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update session code content (REST fallback — real-time via socket)
 * @route  PATCH /api/sessions/:sessionId/code
 * @access Private
 */
const updateSessionCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const session = await sessionService.updateSessionCode(
      req.params.sessionId,
      code,
      req.user._id
    );

    res.status(200).json({
      success: true,
      message: 'Code updated.',
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Archive (soft-delete) a session
 * @route  DELETE /api/sessions/:sessionId
 * @access Private
 */
const archiveSession = async (req, res, next) => {
  try {
    await sessionService.archiveSession(req.params.sessionId, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Session archived successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSessionById,
  getUserSessions,
  joinSession,
  updateSessionCode,
  archiveSession,
};
