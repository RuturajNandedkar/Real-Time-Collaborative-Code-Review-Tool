const express = require('express');
const router = express.Router();

const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.patch('/:commentId/resolve', commentController.resolveComment);
router.delete('/:commentId', commentController.deleteComment);

module.exports = router;
