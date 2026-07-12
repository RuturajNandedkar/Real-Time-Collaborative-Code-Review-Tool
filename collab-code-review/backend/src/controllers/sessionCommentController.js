const sessionCommentService = require('../services/sessionCommentService');

/**
 * @desc   Get all comments for a session
 * @route  GET /api/sessions/:sessionId/comments
 * @access Private
 */
const getComments = async (req, res, next) => {
  try {
    const comments = await sessionCommentService.getComments(req.params.sessionId);
    res.status(200).json({
      success: true,
      count: comments.length,
      data: { comments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Add a new comment to a session
 * @route  POST /api/sessions/:sessionId/comments
 * @access Private
 */
const addComment = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { lineNumber, text } = req.body;
    const comment = await sessionCommentService.addComment({
      sessionId,
      lineNumber,
      authorId: req.user._id,
      text,
    });

    // Broadcast in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('session:comment-added', { comment });
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Toggle resolve status of a comment
 * @route  PATCH /api/sessions/:sessionId/comments/:commentId/resolve
 * @access Private
 */
const toggleResolve = async (req, res, next) => {
  try {
    const { sessionId, commentId } = req.params;
    const { resolved } = req.body;
    const comment = await sessionCommentService.toggleResolveComment(
      commentId,
      resolved
    );

    // Broadcast in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('session:comment-updated', { comment });
    }

    res.status(200).json({
      success: true,
      message: resolved ? 'Comment resolved.' : 'Comment reopened.',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Add a reply to a comment
 * @route  POST /api/sessions/:sessionId/comments/:commentId/replies
 * @access Private
 */
const addReply = async (req, res, next) => {
  try {
    const { sessionId, commentId } = req.params;
    const { text } = req.body;
    const comment = await sessionCommentService.addReply(
      commentId,
      {
        authorId: req.user._id,
        text,
      }
    );

    // Broadcast in real-time
    const io = req.app.get('io');
    if (io) {
      io.to(sessionId).emit('session:comment-updated', { comment });
    }

    res.status(201).json({
      success: true,
      message: 'Reply added successfully.',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getComments,
  addComment,
  toggleResolve,
  addReply,
};
