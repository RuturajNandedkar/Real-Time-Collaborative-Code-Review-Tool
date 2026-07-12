const crypto = require('crypto');
const ReviewRoom = require('../models/ReviewRoom');
const AppError = require('../utils/AppError');

/**
 * Generate a unique invite code.
 */
const generateInviteCode = () => crypto.randomBytes(5).toString('hex').toUpperCase();

/**
 * Create a new review room.
 */
const createRoom = async ({ name, description, language, isPublic, userId }) => {
  const inviteCode = generateInviteCode();
  const room = await ReviewRoom.create({
    name,
    description,
    language,
    isPublic,
    owner: userId,
    inviteCode,
    participants: [{ user: userId, role: 'author' }],
  });
  return room.populate('owner', 'username avatar');
};

/**
 * Get all rooms for a user (owned or participating).
 */
const getUserRooms = async (userId) => {
  return ReviewRoom.find({
    $or: [{ owner: userId }, { 'participants.user': userId }],
    isActive: true,
  })
    .populate('owner', 'username avatar')
    .sort({ updatedAt: -1 });
};

/**
 * Get a single room by ID.
 */
const getRoomById = async (roomId, userId) => {
  const room = await ReviewRoom.findById(roomId)
    .populate('owner', 'username avatar')
    .populate('participants.user', 'username avatar');

  if (!room) throw new AppError('Room not found.', 404);
  if (!room.isActive) throw new AppError('This room has been archived.', 410);

  const isParticipant =
    room.owner._id.toString() === userId.toString() ||
    room.participants.some((p) => p.user._id.toString() === userId.toString());

  if (!room.isPublic && !isParticipant) {
    throw new AppError('You do not have access to this room.', 403);
  }

  return room;
};

/**
 * Join a room via invite code.
 */
const joinRoom = async (inviteCode, userId) => {
  const room = await ReviewRoom.findOne({ inviteCode: inviteCode.toUpperCase() });
  if (!room) throw new AppError('Invalid invite code.', 404);
  if (!room.isActive) throw new AppError('This room has been archived.', 410);

  const alreadyIn = room.participants.some(
    (p) => p.user.toString() === userId.toString()
  );

  if (!alreadyIn) {
    room.participants.push({ user: userId, role: 'reviewer' });
    await room.save();
  }

  return room;
};

/**
 * Update room code content.
 */
const updateRoomCode = async (roomId, code, userId) => {
  const room = await ReviewRoom.findById(roomId);
  if (!room) throw new AppError('Room not found.', 404);

  const isParticipant =
    room.owner.toString() === userId.toString() ||
    room.participants.some((p) => p.user.toString() === userId.toString());

  if (!isParticipant) throw new AppError('Access denied.', 403);

  room.code = code;
  room.updatedAt = Date.now();
  return room.save();
};

/**
 * Archive (soft delete) a room.
 */
const archiveRoom = async (roomId, userId) => {
  const room = await ReviewRoom.findById(roomId);
  if (!room) throw new AppError('Room not found.', 404);
  if (room.owner.toString() !== userId.toString()) {
    throw new AppError('Only the room owner can archive it.', 403);
  }
  room.isActive = false;
  return room.save();
};

module.exports = {
  createRoom,
  getUserRooms,
  getRoomById,
  joinRoom,
  updateRoomCode,
  archiveRoom,
};
