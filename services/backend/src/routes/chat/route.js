const express = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { optionalAuthenticate } = require('../../middleware/authenticate');
const chatController = require('../../controller/chatController');

const router = express.Router();

// Public routes (with optional auth for client state)
router.get('/', optionalAuthenticate, chatController.getMessages);

// Protected routes
router.post('/', authenticate, chatController.sendMessage);
router.delete('/:messageId', authenticate, chatController.deleteMessage);

module.exports = router;
