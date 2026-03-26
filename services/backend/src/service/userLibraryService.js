const prisma = require('../config/prisma');
const userLibraryRepository = require('../repository/userLibraryRepository');

class UserLibraryService {
    _paginate(data, total, page, limit) {
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getFavorites(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            userLibraryRepository.listFavorites(userId, { skip, take: limit }),
            userLibraryRepository.countFavorites(userId),
        ]);

        return this._paginate(data, total, page, limit);
    }

    async addFavorite(userId, koleksiId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { roleId: true }
        });

        // Basic user (roleId 3) has a limit of 10 favorites
        if (user && user.roleId === 3) {
            const favoriteCount = await userLibraryRepository.countFavorites(userId);
            if (favoriteCount >= 10) {
                throw { 
                    status: 403, 
                    message: 'Limit favorit tercapai. Silakan upgrade ke Premium untuk menyimpan lebih dari 10 anime favorit.' 
                };
            }
        }

        const koleksi = await userLibraryRepository.findKoleksiById(koleksiId);
        if (!koleksi) {
            throw { status: 404, message: 'Koleksi not found' };
        }

        if (koleksi.koleksiType !== 'anime') {
            throw { status: 400, message: 'Only anime can be favorited for episode notifications' };
        }

        return userLibraryRepository.upsertFavorite(userId, koleksiId);
    }

    async removeFavorite(userId, koleksiId) {
        try {
            await userLibraryRepository.deleteFavorite(userId, koleksiId);
            return { removed: true };
        } catch (error) {
            if (error.code === 'P2025') {
                return { removed: false };
            }
            throw error;
        }
    }

    async getWatchHistory(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            userLibraryRepository.listWatchHistory(userId, { skip, take: limit }),
            userLibraryRepository.countWatchHistory(userId),
        ]);

        return this._paginate(data, total, page, limit);
    }

    async getWatchHistoryByEpisode(userId, episodeId) {
        if (!episodeId) {
            throw { status: 400, message: 'episodeId is required' };
        }
        const data = await userLibraryRepository.findWatchHistory(userId, episodeId);
        return data;
    }

    async saveWatchHistory(userId, payload) {
        const { episodeId, watchTimeSeconds = 0, isCompleted = false } = payload;
        if (!episodeId) {
            throw { status: 400, message: 'episodeId is required' };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { roleId: true }
        });

        // Basic user (roleId 3) has a limit of 30 unique anime in history
        if (user && user.roleId === 3) {
            const animeId = await userLibraryRepository.findAnimeIdByEpisodeId(episodeId);
            if (animeId) {
                const isInHistory = await userLibraryRepository.isAnimeInHistory(userId, animeId);
                if (!isInHistory) {
                    const uniqueAnimeCount = await userLibraryRepository.countUniqueAnimeInHistory(userId);
                    if (uniqueAnimeCount >= 30) {
                        throw { 
                            status: 403, 
                            message: 'Limit history tercapai. Silakan upgrade ke Premium untuk menonton lebih dari 30 judul anime.' 
                        };
                    }
                }
            }
        }

        const normalizedWatchTime = Number.isFinite(Number(watchTimeSeconds))
            ? Math.max(0, parseInt(watchTimeSeconds, 10))
            : 0;

        return userLibraryRepository.upsertWatchHistory(userId, episodeId, {
            watchTimeSeconds: normalizedWatchTime,
            isCompleted: Boolean(isCompleted),
        });
    }

    async getReadHistory(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            userLibraryRepository.listReadHistory(userId, { skip, take: limit }),
            userLibraryRepository.countReadHistory(userId),
        ]);

        return this._paginate(data, total, page, limit);
    }

    async saveReadHistory(userId, payload) {
        const { chapterId, lastPage = 0, isCompleted = false } = payload;
        if (!chapterId) {
            throw { status: 400, message: 'chapterId is required' };
        }

        const normalizedLastPage = Number.isFinite(Number(lastPage))
            ? Math.max(0, parseInt(lastPage, 10))
            : 0;

        return userLibraryRepository.upsertReadHistory(userId, chapterId, {
            lastPage: normalizedLastPage,
            isCompleted: Boolean(isCompleted),
        });
    }

    async getNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            userLibraryRepository.listNotifications(userId, { skip, take: limit, unreadOnly }),
            userLibraryRepository.countNotifications(userId, unreadOnly),
        ]);

        return this._paginate(data, total, page, limit);
    }

    async markNotificationRead(userId, notificationId) {
        const result = await userLibraryRepository.markNotificationAsRead(userId, notificationId);
        if (!result.count) {
            throw { status: 404, message: 'Notification not found' };
        }

        return { updated: result.count };
    }

    async markAllNotificationsRead(userId) {
        return userLibraryRepository.markAllNotificationsAsRead(userId);
    }

    async notifyUsersForEpisodeUpdate(episodeId) {
        const episode = await userLibraryRepository.findEpisodeWithAnime(episodeId);
        if (!episode || !episode.anime || !episode.anime.koleksi) {
            return { notified: 0 };
        }

        const koleksi = episode.anime.koleksi;
        const favoriteUsers = await userLibraryRepository.findFavoriteUsersByKoleksi(koleksi.id);
        if (!favoriteUsers.length) {
            return { notified: 0 };
        }

        const episodeLabel = episode.episodeNumber !== null && episode.episodeNumber !== undefined
            ? `Episode ${episode.episodeNumber}`
            : 'New Episode';
        const title = `${koleksi.title} update`;
        const message = `${episodeLabel} is now available`;

        await prisma.$transaction(async (tx) => {
            for (const user of favoriteUsers) {
                await userLibraryRepository.upsertEpisodeNotification(
                    user.userId,
                    episode.id,
                    title,
                    message,
                    {
                        koleksiSlug: koleksi.slug,
                        koleksiTitle: koleksi.title,
                        episodeNumber: episode.episodeNumber,
                    },
                    koleksi.id,
                    tx,
                );
            }
        });

        return { notified: favoriteUsers.length };
    }

    async getBroadcasts(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            userLibraryRepository.listBroadcasts({ skip, take: limit }),
            userLibraryRepository.countBroadcasts(),
        ]);

        return this._paginate(data, total, page, limit);
    }

    async createBroadcast(adminId, payload) {
        const allowedLevels = new Set(['maintenance', 'info']);
        if (!payload.level || !allowedLevels.has(payload.level)) {
            throw { status: 400, message: 'level must be maintenance or info' };
        }

        if (!payload.title || !payload.message) {
            throw { status: 400, message: 'title and message are required' };
        }

        const result = await prisma.$transaction(async (tx) => {
            const broadcast = await userLibraryRepository.createBroadcast(adminId, payload, tx);
            const users = await userLibraryRepository.findAllNonAdminUsers(tx);

            for (const user of users) {
                await userLibraryRepository.upsertBroadcastNotification(
                    user.id,
                    broadcast.id,
                    payload.title,
                    payload.message,
                    payload.level,
                    tx,
                );
            }

            return {
                broadcast,
                recipients: users.length,
            };
        });

        return result;
    }
}

module.exports = new UserLibraryService();
