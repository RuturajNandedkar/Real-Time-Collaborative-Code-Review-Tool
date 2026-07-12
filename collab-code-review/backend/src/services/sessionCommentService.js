const SessionComment = require('../models/SessionComment');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');

/**
 * Fetch all comments for a session, populated with authors.
 */
const getComments = async (sessionId) => {
  return SessionComment.find({ sessionId })
    .populate('author', 'username avatar')
    .populate('replies.author', 'username avatar')
    .sort({ lineNumber: 1, createdAt: 1 });
};

/**
 * Add a new comment to a session.
 */
const addComment = async ({ sessionId, lineNumber, authorId, text }) => {
  // Validate session exists and is active
  const session = await Session.findOne({ sessionId, isActive: true });
  if (!session) {
    throw new AppError('Active session not found', 404);
  }

  const comment = await SessionComment.create({
    sessionId,
    lineNumber,
    author: authorId,
    text,
  });

  return comment.populate('author', 'username avatar');
};

/**
 * Toggle the resolved status of a comment.
 */
const toggleResolveComment = async (commentId, resolved) => {
  const comment = await SessionComment.findById(commentId);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  comment.resolved = resolved;
  await comment.save();

  return comment.populate([
    { path: 'author', select: 'username avatar' },
    { path: 'replies.author', select: 'username avatar' },
  ]);
};

/**
 * Add a reply to a comment.
 */
const addReply = async (commentId, { authorId, text }) => {
  const comment = await SessionComment.findById(commentId);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  comment.replies.push({ author: authorId, text });
  await comment.save();

  return comment.populate([
    { path: 'author', select: 'username avatar' },
    { path: 'replies.author', select: 'username avatar' },
  ]);
};

module.exports = {
  getComments,
  addComment,
  toggleResolveComment,
  addReply,
};
