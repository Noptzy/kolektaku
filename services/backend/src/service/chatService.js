const chatRepo = require('../repository/chatRepository');

class ChatService {
    async sendMessage(userId, content) {
        if (!content || !content.trim()) {
            throw new Error('Message cannot be empty');
        }

        return chatRepo.createMessage({ userId, content: content.trim() });
    }

    async getRecentMessages(limit = 100) {
        const messages = await chatRepo.getMessages({ take: limit });
        // Return in chronological order since query is 'desc'
        return messages.reverse();
    }

    async deleteMessage(messageId, user) {
        const message = await chatRepo.findById(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        const isAdmin = user.roleId === 1;
        if (message.userId !== user.id && !isAdmin) {
            throw new Error('Unauthorized to delete this message');
        }

        await chatRepo.deleteMessage(messageId);
        return true;
    }
}

module.exports = new ChatService();
