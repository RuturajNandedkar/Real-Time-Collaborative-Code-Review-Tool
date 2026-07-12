const Comment = require('../models/Comment');
const ReviewRoom = require('../models/ReviewRoom');
const AppError = require('../utils/AppError');

/**
 * @desc   Add a comment to a room
 * @route  POST /api/rooms/:id/comments
 * @access Private
 */
const addComment = async (req, res, next) => {
  try {
    const { content, lineNumber, type } = req.body;
    const room = await ReviewRoom.findById(req.params.id);

    if (!room || !room.isActive) return next(new AppError('Room not found.', 404));

    const comment = await Comment.create({
      room: room._id,
      author: req.user._id,
      content,
      lineNumber,
      type,
    });

    await comment.populate('author', 'username avatar');

    res.status(201).json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get comments for a room
 * @route  GET /api/rooms/:id/comments
 * @access Private
 */
const getRoomComments = async (req, res, next) => {
  try {
    const comments = await Comment.find({ room: req.params.id })
      .populate('author', 'username avatar')
      .populate('resolvedBy', 'username')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: comments.length, data: { comments } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Resolve / unresolve a comment
 * @route  PATCH /api/comments/:commentId/resolve
 * @access Private
 */
const resolveComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return next(new AppError('Comment not found.', 404));

    comment.resolved = !comment.resolved;
    comment.resolvedBy = comment.resolved ? req.user._id : undefined;
    comment.resolvedAt = comment.resolved ? new Date() : undefined;

    await comment.save();
    res.status(200).json({ success: true, data: { comment } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Delete a comment (author or admin only)
 * @route  DELETE /api/comments/:commentId
 * @access Private
 */
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return next(new AppError('Comment not found.', 404));

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return next(new AppError('You are not authorized to delete this comment.', 403));
    }

    await comment.deleteOne();
    res.status(200).json({ success: true, message: 'Comment deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { addComment, getRoomComments, resolveComment, deleteComment };
