const prisma = require('../config/prisma');

class ChatRepository {
    createMessage({ userId, content }, tx = prisma) {
        return tx.chatMessage.create({
            data: {
                userId,
                content,
                createdAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } }
            }
        });
    }

    getMessages({ skip = 0, take = 50 } = {}, tx = prisma) {
        return tx.chatMessage.findMany({
            skip,
            take,
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    deleteMessage(id, tx = prisma) {
        return tx.chatMessage.delete({
            where: { id }
        });
    }

    findById(id, tx = prisma) {
        return tx.chatMessage.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } }
            }
        });
    }
}

module.exports = new ChatRepository();
