const roomService = require('../services/roomService');

/**
 * @desc   Create a new review room
 * @route  POST /api/rooms
 * @access Private
 */
const createRoom = async (req, res, next) => {
  try {
    const { name, description, language, isPublic } = req.body;
    const room = await roomService.createRoom({
      name,
      description,
      language,
      isPublic,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: { room } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get all rooms for authenticated user
 * @route  GET /api/rooms
 * @access Private
 */
const getUserRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.getUserRooms(req.user._id);
    res.status(200).json({ success: true, count: rooms.length, data: { rooms } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Get single room
 * @route  GET /api/rooms/:id
 * @access Private
 */
const getRoomById = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: { room } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Join room by invite code
 * @route  POST /api/rooms/join
 * @access Private
 */
const joinRoom = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const room = await roomService.joinRoom(inviteCode, req.user._id);
    res.status(200).json({ success: true, message: 'Joined room successfully.', data: { room } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Archive (soft-delete) a room
 * @route  DELETE /api/rooms/:id
 * @access Private
 */
const archiveRoom = async (req, res, next) => {
  try {
    await roomService.archiveRoom(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: 'Room archived successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc   Update code content of a room (REST — real-time via socket is preferred)
 * @route  PATCH /api/rooms/:id/code
 * @access Private
 */
const updateRoomCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const room = await roomService.updateRoomCode(req.params.id, code, req.user._id);
    res.status(200).json({ success: true, message: 'Code saved.', data: { room } });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRoom, getUserRooms, getRoomById, joinRoom, archiveRoom, updateRoomCode };
