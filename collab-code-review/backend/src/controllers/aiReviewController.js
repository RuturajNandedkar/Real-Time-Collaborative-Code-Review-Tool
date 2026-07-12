const aiReviewService = require('../services/aiReviewService');

/**
 * @desc   Analyze code content using LLM APIs
 * @route  POST /api/sessions/:sessionId/ai-review
 * @access Private
 */
const runCodeReview = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required for AI review.',
      });
    }

    const review = await aiReviewService.getCodeReview(code, language || 'javascript');

    res.status(200).json({
      success: true,
      data: { review },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runCodeReview,
};
