const prisma = require('../config/prisma');

class CommentRepository {
    createComment({ userId, episodeId, content }, tx = prisma) {
        return tx.episodeComment.create({
            data: {
                userId,
                episodeId,
                content,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } }
            }
        });
    }

    findByEpisode(episodeId, { skip = 0, take = 50 } = {}, tx = prisma) {
        return tx.episodeComment.findMany({
            where: { episodeId },
            skip,
            take,
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    countByEpisode(episodeId, tx = prisma) {
        return tx.episodeComment.count({
            where: { episodeId }
        });
    }

    findById(id, tx = prisma) {
        return tx.episodeComment.findUnique({
            where: { id }
        });
    }

    deleteComment(id, tx = prisma) {
        return tx.episodeComment.delete({
            where: { id }
        });
    }
}

module.exports = new CommentRepository();
