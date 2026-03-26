const chatService = require('../service/chatService');
const resHandler = require('../utils/resHandler');

class ChatController {
    async sendMessage(req, res) {
        try {
            const userId = req.user.id;
            const { content } = req.body;

            const message = await chatService.sendMessage(userId, content);

            return res.status(201).json(resHandler.success('Message sent successfully', message));
        } catch (error) {
            console.error('Send message error:', error);
            if (error.message === 'Message cannot be empty') {
                return res.status(400).json(resHandler.error(error.message));
            }
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async getMessages(req, res) {
        try {
            const { limit } = req.query;
            const messages = await chatService.getRecentMessages(limit ? parseInt(limit) : 100);

            return res.status(200).json(resHandler.success('Chat messages retrieved successfully', messages));
        } catch (error) {
            console.error('Get messages error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async deleteMessage(req, res) {
        try {
            const { messageId } = req.params;
            const user = req.user;

            await chatService.deleteMessage(messageId, user);

            return res.status(200).json(resHandler.success('Message deleted successfully'));
        } catch (error) {
            console.error('Delete message error:', error);
            if (error.message === 'Message not found') {
                return res.status(404).json(resHandler.error(error.message));
            }
            if (error.message === 'Unauthorized to delete this message') {
                return res.status(403).json(resHandler.error(error.message));
            }
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }
}

module.exports = new ChatController();
