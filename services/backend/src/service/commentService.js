const commentRepo = require('../repository/commentRepository');
const prisma = require('../config/prisma');

class CommentService {
    async addComment(userId, episodeId, content) {
        if (!content || !content.trim()) {
            throw new Error('Comment content cannot be empty');
        }

        // Verify episode exists
        const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
        if (!episode) {
            throw new Error('Episode not found');
        }

        // Check if user is premium (roleId <= 2)
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { roleId: true } });
        if (!user || user.roleId > 2) {
            throw new Error('Only premium members can comment');
        }

        return commentRepo.createComment({ userId, episodeId, content: content.trim() });
    }

    async getComments(episodeId, { page = 1, limit = 50 }) {
        const skip = (page - 1) * limit;
        const [comments, total] = await Promise.all([
            commentRepo.findByEpisode(episodeId, { skip, take: parseInt(limit) }),
            commentRepo.countByEpisode(episodeId)
        ]);

        return {
            comments,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        };
    }

    async deleteComment(commentId, userId, userRole) {
        const comment = await commentRepo.findById(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        // Allow deletion if user is the author or has admin privileges
        const isAdmin = userRole === 1;
        
        if (comment.userId !== userId && !isAdmin) {
            throw new Error('Unauthorized to delete this comment');
        }

        await commentRepo.deleteComment(commentId);
        return true;
    }
}

module.exports = new CommentService();
