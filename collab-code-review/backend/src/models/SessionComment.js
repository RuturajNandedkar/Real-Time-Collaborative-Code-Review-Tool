const mongoose = require('mongoose');

const replySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Reply text is required'],
      maxlength: [1000, 'Reply cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const sessionCommentSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: [true, 'Session ID is required'],
      index: true,
    },
    lineNumber: {
      type: Number,
      required: [true, 'Line number is required'],
      min: 1,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Comment text is required'],
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    replies: [replySchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for querying comments per session/line
sessionCommentSchema.index({ sessionId: 1, lineNumber: 1 });
sessionCommentSchema.index({ sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('SessionComment', sessionCommentSchema);
