const Session = require('../models/Session');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Create a new review session.
 *
 * @param {object} params
 * @param {string} params.title
 * @param {string} params.language
 * @param {string} [params.code]          - Optional initial code
 * @param {string} params.userId          - MongoDB ObjectId of the creator
 * @returns {Promise<Session>}
 */
const createSession = async ({ title, language, code = '', userId }) => {
  const session = await Session.create({
    title,
    language,
    code,
    createdBy: userId,
    // creator is auto-added as 'author' participant via pre-save hook
  });

  return session.populate([
    { path: 'createdBy', select: 'username avatar' },
    { path: 'participants.user', select: 'username avatar' },
  ]);
};

/**
 * Fetch a session by its human-readable UUID sessionId.
 * Also validates that the requesting user is a participant or the creator.
 *
 * @param {string} sessionId  - UUID string (not Mongo _id)
 * @param {string} userId     - MongoDB ObjectId of the requester
 * @returns {Promise<Session>}
 */
const getSessionById = async (sessionId, userId) => {
  const session = await Session.findOne({ sessionId })
    .populate('createdBy', 'username avatar email')
    .populate('participants.user', 'username avatar')
    .populate('snapshot.takenBy', 'username');

  if (!session) {
    throw new AppError(`Session with ID "${sessionId}" not found.`, 404);
  }

  if (!session.isActive) {
    throw new AppError('This session has been archived.', 410);
  }

  // Access check — creator or participant
  const isCreator = session.createdBy._id.toString() === userId.toString();
  const isParticipant = session.participants.some(
    (p) => p.user._id.toString() === userId.toString()
  );

  if (!isCreator && !isParticipant) {
    throw new AppError('You do not have access to this session.', 403);
  }

  return session;
};

/**
 * Fetch all sessions belonging to or participated in by a user.
 *
 * @param {string} userId
 * @returns {Promise<Session[]>}
 */
const getUserSessions = async (userId) => {
  return Session.find({
    $or: [{ createdBy: userId }, { 'participants.user': userId }],
    isActive: true,
  })
    .populate('createdBy', 'username avatar')
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Add a participant to an existing session (by sessionId).
 * Idempotent — does nothing if the user is already a participant.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {'reviewer'|'observer'} role
 * @returns {Promise<Session>}
 */
const joinSession = async (sessionId, userId, role = 'reviewer') => {
  const session = await Session.findOne({ sessionId });

  if (!session) throw new AppError('Session not found.', 404);
  if (!session.isActive) throw new AppError('This session has been archived.', 410);

  const alreadyIn = session.participants.some(
    (p) => p.user.toString() === userId.toString()
  );

  if (!alreadyIn) {
    session.participants.push({ user: userId, role });
    await session.save();
  }

  return session.populate([
    { path: 'createdBy', select: 'username avatar' },
    { path: 'participants.user', select: 'username avatar' },
  ]);
};

/**
 * Update the live code content of a session.
 *
 * @param {string} sessionId
 * @param {string} code
 * @param {string} userId  - Must be a participant or creator
 * @returns {Promise<Session>}
 */
const updateSessionCode = async (sessionId, code, userId) => {
  const session = await Session.findOne({ sessionId });
  if (!session) throw new AppError('Session not found.', 404);

  const isAuthorized =
    session.createdBy.toString() === userId.toString() ||
    session.participants.some((p) => p.user.toString() === userId.toString());

  if (!isAuthorized) throw new AppError('Access denied.', 403);

  session.code = code;
  return session.save();
};

/**
 * Archive (soft-delete) a session. Only the creator can do this.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @returns {Promise<Session>}
 */
const archiveSession = async (sessionId, userId) => {
  const session = await Session.findOne({ sessionId });
  if (!session) throw new AppError('Session not found.', 404);

  if (session.createdBy.toString() !== userId.toString()) {
    throw new AppError('Only the session creator can archive it.', 403);
  }

  session.isActive = false;
  return session.save();
};

module.exports = {
  createSession,
  getSessionById,
  getUserSessions,
  joinSession,
  updateSessionCode,
  archiveSession,
};
