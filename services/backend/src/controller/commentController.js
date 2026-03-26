const commentService = require('../service/commentService');
const resHandler = require('../utils/resHandler');

class CommentController {
    async addComment(req, res) {
        try {
            const { episodeId } = req.params;
            const userId = req.user.id;
            const { content } = req.body;

            const comment = await commentService.addComment(userId, episodeId, content);

            return res.status(201).json(resHandler.success('Comment added successfully', comment));
        } catch (error) {
            console.error('Add comment error:', error);
            if (error.message === 'Comment content cannot be empty' || error.message === 'Episode not found') {
                return res.status(400).json(resHandler.error(error.message));
            }
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async getComments(req, res) {
        try {
            const { episodeId } = req.params;
            const { page, limit } = req.query;

            const data = await commentService.getComments(episodeId, { page, limit });

            return res.status(200).json(resHandler.success('Comments retrieved successfully', data));
        } catch (error) {
            console.error('Get comments error:', error);
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }

    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.roleId; // Attached by authenticate middleware

            await commentService.deleteComment(commentId, userId, userRole);

            return res.status(200).json(resHandler.success('Comment deleted successfully'));
        } catch (error) {
            console.error('Delete comment error:', error);
            if (error.message === 'Comment not found') {
                return res.status(404).json(resHandler.error(error.message));
            }
            if (error.message === 'Unauthorized to delete this comment') {
                return res.status(403).json(resHandler.error(error.message));
            }
            return res.status(500).json(resHandler.error('Internal server error'));
        }
    }
}

module.exports = new CommentController();
