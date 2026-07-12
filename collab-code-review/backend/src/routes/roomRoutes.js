const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const roomController = require('../controllers/roomController');
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

// All room routes require authentication
router.use(protect);

const createRoomRules = [
  body('name').trim().notEmpty().withMessage('Room name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('language').optional().isString(),
  body('isPublic').optional().isBoolean(),
];

const joinRoomRules = [
  body('inviteCode').trim().notEmpty().withMessage('Invite code is required'),
];

const addCommentRules = [
  body('content').trim().notEmpty().withMessage('Comment content is required')
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters'),
  body('lineNumber').optional().isInt({ min: 0 }),
  body('type').optional().isIn(['general', 'suggestion', 'issue', 'praise']),
];

const updateCodeRules = [
  body('code').notEmpty().withMessage('Code is required').isString(),
];

// Room routes
router.get('/', roomController.getUserRooms);
router.post('/', createRoomRules, validate, roomController.createRoom);
router.post('/join', joinRoomRules, validate, roomController.joinRoom);
router.get('/:id', roomController.getRoomById);
router.patch('/:id/code', updateCodeRules, validate, roomController.updateRoomCode);
router.delete('/:id', roomController.archiveRoom);

// Comment routes nested under rooms
router.get('/:id/comments', roomController.getRoomById, commentController.getRoomComments);
router.post('/:id/comments', addCommentRules, validate, commentController.addComment);

module.exports = router;
