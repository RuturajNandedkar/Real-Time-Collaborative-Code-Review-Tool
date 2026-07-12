const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const sessionController = require('../controllers/sessionController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const sessionCommentController = require('../controllers/sessionCommentController');
const aiReviewController = require('../controllers/aiReviewController');

// All session routes require authentication
router.use(protect);

// ─── Validation Rules ──────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = [
  'javascript', 'python', 'java', 'cpp',
  'typescript', 'csharp', 'go', 'rust', 'plaintext',
];

const createSessionRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Session title is required')
    .isLength({ max: 120 }).withMessage('Title cannot exceed 120 characters'),
  body('language')
    .notEmpty().withMessage('Language is required')
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
  body('code')
    .optional()
    .isString().withMessage('Code must be a string')
    .isLength({ max: 500000 }).withMessage('Code cannot exceed 500 KB'),
];

const sessionIdParam = [
  param('sessionId')
    .trim()
    .notEmpty().withMessage('Session ID is required')
    .isUUID().withMessage('Session ID must be a valid UUID'),
];

const joinSessionRules = [
  ...sessionIdParam,
  body('role')
    .optional()
    .isIn(['reviewer', 'observer'])
    .withMessage('Role must be "reviewer" or "observer"'),
];

const updateCodeRules = [
  ...sessionIdParam,
  body('code')
    .notEmpty().withMessage('Code content is required')
    .isString().withMessage('Code must be a string'),
];

const addSessionCommentRules = [
  ...sessionIdParam,
  body('lineNumber')
    .notEmpty().withMessage('Line number is required')
    .isInt({ min: 1 }).withMessage('Line number must be a positive integer'),
  body('text')
    .trim()
    .notEmpty().withMessage('Comment text is required')
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters'),
];

const toggleResolveCommentRules = [
  ...sessionIdParam,
  param('commentId')
    .notEmpty().withMessage('Comment ID is required')
    .isMongoId().withMessage('Comment ID must be a valid Mongo ID'),
  body('resolved')
    .notEmpty().withMessage('Resolved state is required')
    .isBoolean().withMessage('Resolved must be a boolean value'),
];

const addReplyRules = [
  ...sessionIdParam,
  param('commentId')
    .notEmpty().withMessage('Comment ID is required')
    .isMongoId().withMessage('Comment ID must be a valid Mongo ID'),
  body('text')
    .trim()
    .notEmpty().withMessage('Reply text is required')
    .isLength({ max: 1000 }).withMessage('Reply cannot exceed 1000 characters'),
];

const runAiReviewRules = [
  ...sessionIdParam,
  body('code')
    .notEmpty().withMessage('Code content is required')
    .isString().withMessage('Code must be a string'),
  body('language')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
];

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET  /api/sessions            — list all sessions for authenticated user
 * POST /api/sessions            — create a new session
 */
router
  .route('/')
  .get(sessionController.getUserSessions)
  .post(createSessionRules, validate, sessionController.createSession);

/**
 * GET    /api/sessions/:sessionId  — fetch session by UUID
 * DELETE /api/sessions/:sessionId  — archive session
 */
router
  .route('/:sessionId')
  .get(sessionIdParam, validate, sessionController.getSessionById)
  .delete(sessionIdParam, validate, sessionController.archiveSession);

/**
 * POST  /api/sessions/:sessionId/join  — join as participant
 */
router.post(
  '/:sessionId/join',
  joinSessionRules,
  validate,
  sessionController.joinSession
);

/**
 * PATCH /api/sessions/:sessionId/code  — REST code update (socket is preferred)
 */
router.patch(
  '/:sessionId/code',
  updateCodeRules,
  validate,
  sessionController.updateSessionCode
);

// ─── Comment Routes ────────────────────────────────────────────────────────────

/**
 * GET  /api/sessions/:sessionId/comments  — get all comments
 * POST /api/sessions/:sessionId/comments  — create a new comment
 */
router
  .route('/:sessionId/comments')
  .get(sessionIdParam, validate, sessionCommentController.getComments)
  .post(addSessionCommentRules, validate, sessionCommentController.addComment);

/**
 * PATCH /api/sessions/:sessionId/comments/:commentId/resolve  — toggle resolve state
 */
router.patch(
  '/:sessionId/comments/:commentId/resolve',
  toggleResolveCommentRules,
  validate,
  sessionCommentController.toggleResolve
);

/**
 * POST /api/sessions/:sessionId/comments/:commentId/replies  — add reply
 */
router.post(
  '/:sessionId/comments/:commentId/replies',
  addReplyRules,
  validate,
  sessionCommentController.addReply
);

// ─── AI Review Routes ──────────────────────────────────────────────────────────

/**
 * POST /api/sessions/:sessionId/ai-review  — trigger AI code review
 */
router.post(
  '/:sessionId/ai-review',
  runAiReviewRules,
  validate,
  aiReviewController.runCodeReview
);

module.exports = router;
