const userLibraryService = require('../service/userLibraryService');
const resHandler = require('../utils/resHandler');
const prisma = require('../config/prisma');

exports.getBilling = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const subscription = await prisma.userSubscription.findUnique({
            where: { userId }
        });
        
        // Lazy expiration: mark pending transactions older than 30 mins as failed
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        await prisma.transaction.updateMany({
            where: {
                userId,
                status: 'pending',
                createdAt: { lt: thirtyMinsAgo }
            },
            data: { status: 'failed', updatedAt: new Date() }
        });
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                plan: {
                    select: { id: true, title: true, durationDays: true }
                }
            }
        });
        
        const total = await prisma.transaction.count({ where: { userId } });
        
        const data = transactions.map(trx => ({
            ...trx,
            amount: trx.amount ? Number(trx.amount) : null
        }));

        return res.status(200).json(resHandler.success('Billing retrieved', {
            subscription,
            transactions: data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        }));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get billing information'));
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await userLibraryService.getFavorites(req.user.id, page, limit);
        return res.status(200).json(resHandler.success('Favorites retrieved successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get favorites'));
    }
};

exports.addFavorite = async (req, res) => {
    try {
        const result = await userLibraryService.addFavorite(req.user.id, req.params.koleksiId);
        return res.status(200).json(resHandler.success('Favorite saved successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to save favorite'));
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        const result = await userLibraryService.removeFavorite(req.user.id, req.params.koleksiId);
        return res.status(200).json(resHandler.success('Favorite removed successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to remove favorite'));
    }
};

exports.getWatchHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await userLibraryService.getWatchHistory(req.user.id, page, limit);
        return res.status(200).json(resHandler.success('Watch history retrieved successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get watch history'));
    }
};

exports.getWatchHistoryByEpisode = async (req, res) => {
    try {
        const result = await userLibraryService.getWatchHistoryByEpisode(req.user.id, req.params.episodeId);
        return res.status(200).json(resHandler.success('Watch history for episode retrieved', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get episode watch history'));
    }
};

exports.saveWatchHistory = async (req, res) => {
    try {
        const result = await userLibraryService.saveWatchHistory(req.user.id, req.body || {});
        return res.status(200).json(resHandler.success('Watch history updated successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to update watch history'));
    }
};

exports.getReadHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await userLibraryService.getReadHistory(req.user.id, page, limit);
        return res.status(200).json(resHandler.success('Read history retrieved successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get read history'));
    }
};

exports.saveReadHistory = async (req, res) => {
    try {
        const result = await userLibraryService.saveReadHistory(req.user.id, req.body || {});
        return res.status(200).json(resHandler.success('Read history updated successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to update read history'));
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const unreadOnly = req.query.unreadOnly === 'true';
        const result = await userLibraryService.getNotifications(req.user.id, page, limit, unreadOnly);
        return res.status(200).json(resHandler.success('Notifications retrieved successfully', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get notifications'));
    }
};

exports.markNotificationRead = async (req, res) => {
    try {
        const result = await userLibraryService.markNotificationRead(req.user.id, req.params.notificationId);
        return res.status(200).json(resHandler.success('Notification marked as read', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to mark notification as read'));
    }
};

exports.markAllNotificationsRead = async (req, res) => {
    try {
        const result = await userLibraryService.markAllNotificationsRead(req.user.id);
        return res.status(200).json(resHandler.success('All notifications marked as read', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to mark all notifications as read'));
    }
};
