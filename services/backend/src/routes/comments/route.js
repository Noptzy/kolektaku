const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { optionalAuthenticate } = require('../../middleware/authenticate');
const commentController = require('../../controller/commentController');

const router = express.Router();

// Public routes (with optional auth for client state)
router.get('/episode/:episodeId', optionalAuthenticate, commentController.getComments);

// Protected routes
router.post('/episode/:episodeId', authenticate, commentController.addComment);
router.delete('/:commentId', authenticate, commentController.deleteComment);

module.exports = router;
