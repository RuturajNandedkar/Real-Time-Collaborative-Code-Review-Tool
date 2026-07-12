const mongoose = require('mongoose');

const reviewRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      maxlength: [100, 'Room name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    code: {
      type: String,
      default: '// Start typing your code here...',
    },
    language: {
      type: String,
      enum: [
        'javascript', 'typescript', 'python', 'java', 'csharp',
        'cpp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
        'html', 'css', 'sql', 'plaintext',
      ],
      default: 'javascript',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['reviewer', 'author', 'observer'], default: 'reviewer' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewRoomSchema.virtual('participantCount').get(function () {
  return this.participants.length;
});

reviewRoomSchema.index({ owner: 1, createdAt: -1 });
// Note: inviteCode index is created implicitly via unique: true, sparse: true on the field

module.exports = mongoose.model('ReviewRoom', reviewRoomSchema);
