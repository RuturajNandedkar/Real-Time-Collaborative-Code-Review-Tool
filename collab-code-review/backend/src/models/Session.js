const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * Session — a focused, shareable code review session with a unique sessionId.
 * Distinguished from ReviewRoom by being lighter and directly addressable by
 * a human-readable UUID rather than a Mongo ObjectId.
 */
const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      default: () => uuidv4(),
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      enum: {
        values: ['javascript', 'python', 'java', 'cpp', 'typescript', 'csharp', 'go', 'rust', 'plaintext'],
        message: '{VALUE} is not a supported language',
      },
      default: 'javascript',
    },
    code: {
      type: String,
      default: '',
      maxlength: [500000, 'Code content cannot exceed 500 KB'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Session must have a creator'],
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: {
          type: String,
          enum: ['author', 'reviewer', 'observer'],
          default: 'reviewer',
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    /**
     * Snapshot of code taken at a point in time for review reference.
     * Populated when a reviewer explicitly "locks" the session for review.
     */
    snapshot: {
      code: { type: String, default: '' },
      takenAt: { type: Date },
      takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ──────────────────────────────────────────────────────────────────
sessionSchema.virtual('participantCount').get(function () {
  return this.participants.length;
});

// ─── Indexes ───────────────────────────────────────────────────────────────────
sessionSchema.index({ createdBy: 1, createdAt: -1 });
sessionSchema.index({ 'participants.user': 1 });

// ─── Pre-save: auto-add creator as author participant ─────────────────────────
sessionSchema.pre('save', function (next) {
  if (this.isNew) {
    const alreadyParticipant = this.participants.some(
      (p) => p.user.toString() === this.createdBy.toString()
    );
    if (!alreadyParticipant) {
      this.participants.push({ user: this.createdBy, role: 'author' });
    }
  }
  next();
});

module.exports = mongoose.model('Session', sessionSchema);
