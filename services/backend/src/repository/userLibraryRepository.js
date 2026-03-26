const prisma = require('../config/prisma');

class UserLibraryRepository {
    findKoleksiById(koleksiId, tx = prisma) {
        return tx.koleksi.findUnique({
            where: { id: koleksiId },
            select: {
                id: true,
                title: true,
                slug: true,
                koleksiType: true,
                posterUrl: true,
            },
        });
    }

    listFavorites(userId, { skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.userFavorite.findMany({
            where: { userId },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        koleksiType: true,
                        posterUrl: true,
                        animeDetail: {
                            select: {
                                totalEpisodes: true,
                            },
                        },
                    },
                },
            },
        });
    }

    countFavorites(userId, tx = prisma) {
        return tx.userFavorite.count({ where: { userId } });
    }

    upsertFavorite(userId, koleksiId, tx = prisma) {
        const now = new Date();
        return tx.userFavorite.upsert({
            where: {
                userId_koleksiId: {
                    userId,
                    koleksiId,
                },
            },
            update: {
                updatedAt: now,
            },
            create: {
                userId,
                koleksiId,
                createdAt: now,
                updatedAt: now,
            },
        });
    }

    deleteFavorite(userId, koleksiId, tx = prisma) {
        return tx.userFavorite.delete({
            where: {
                userId_koleksiId: {
                    userId,
                    koleksiId,
                },
            },
        });
    }

    upsertWatchHistory(userId, episodeId, { watchTimeSeconds = 0, isCompleted = false } = {}, tx = prisma) {
        const now = new Date();
        return tx.userWatchHistory.upsert({
            where: {
                userId_episodeId: {
                    userId,
                    episodeId,
                },
            },
            update: {
                watchTimeSeconds,
                isCompleted,
                updatedAt: now,
            },
            create: {
                userId,
                episodeId,
                watchTimeSeconds,
                isCompleted,
                updatedAt: now,
            },
        });
    }

    listWatchHistory(userId, { skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.userWatchHistory.findMany({
            where: { userId },
            skip,
            take,
            orderBy: { updatedAt: 'desc' },
            include: {
                episode: {
                    select: {
                        id: true,
                        episodeNumber: true,
                        title: true,
                        anime: {
                            select: {
                                koleksi: {
                                    select: {
                                        id: true,
                                        title: true,
                                        slug: true,
                                        posterUrl: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    countWatchHistory(userId, tx = prisma) {
        return tx.userWatchHistory.count({ where: { userId } });
    }

    findWatchHistory(userId, episodeId, tx = prisma) {
        return tx.userWatchHistory.findUnique({
            where: {
                userId_episodeId: {
                    userId,
                    episodeId,
                },
            },
            include: {
                episode: {
                    select: {
                        id: true,
                        episodeNumber: true,
                        title: true,
                    },
                },
            },
        });
    }

    async countUniqueAnimeInHistory(userId, tx = prisma) {
        const history = await tx.userWatchHistory.findMany({
            where: { userId },
            select: {
                episode: {
                    select: {
                        animeId: true
                    }
                }
            }
        });
        const animeIds = new Set(history.map(h => h.episode.animeId));
        return animeIds.size;
    }

    async findAnimeIdByEpisodeId(episodeId, tx = prisma) {
        const ep = await tx.episode.findUnique({
            where: { id: episodeId },
            select: { animeId: true }
        });
        return ep?.animeId;
    }

    async isAnimeInHistory(userId, animeId, tx = prisma) {
        const count = await tx.userWatchHistory.count({
            where: {
                userId,
                episode: {
                    animeId
                }
            }
        });
        return count > 0;
    }

    upsertReadHistory(userId, chapterId, { lastPage = 0, isCompleted = false } = {}, tx = prisma) {
        const now = new Date();
        return tx.userReadHistory.upsert({
            where: {
                userId_chapterId: {
                    userId,
                    chapterId,
                },
            },
            update: {
                lastPage,
                isCompleted,
                updatedAt: now,
            },
            create: {
                userId,
                chapterId,
                lastPage,
                isCompleted,
                updatedAt: now,
            },
        });
    }

    listReadHistory(userId, { skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.userReadHistory.findMany({
            where: { userId },
            skip,
            take,
            orderBy: { updatedAt: 'desc' },
            include: {
                chapter: {
                    select: {
                        id: true,
                        chapterNumber: true,
                        title: true,
                        manga: {
                            select: {
                                koleksi: {
                                    select: {
                                        id: true,
                                        title: true,
                                        slug: true,
                                        posterUrl: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    countReadHistory(userId, tx = prisma) {
        return tx.userReadHistory.count({ where: { userId } });
    }

    listNotifications(userId, { skip = 0, take = 20, unreadOnly = false } = {}, tx = prisma) {
        return tx.userNotification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { isRead: false } : {}),
            },
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        posterUrl: true,
                    },
                },
                episode: {
                    select: {
                        id: true,
                        episodeNumber: true,
                        title: true,
                    },
                },
                broadcast: {
                    select: {
                        id: true,
                        level: true,
                        title: true,
                    },
                },
            },
        });
    }

    countNotifications(userId, unreadOnly = false, tx = prisma) {
        return tx.userNotification.count({
            where: {
                userId,
                ...(unreadOnly ? { isRead: false } : {}),
            },
        });
    }

    markNotificationAsRead(userId, notificationId, tx = prisma) {
        return tx.userNotification.updateMany({
            where: {
                id: notificationId,
                userId,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    markAllNotificationsAsRead(userId, tx = prisma) {
        return tx.userNotification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    findEpisodeWithAnime(episodeId, tx = prisma) {
        return tx.episode.findUnique({
            where: { id: episodeId },
            select: {
                id: true,
                episodeNumber: true,
                title: true,
                anime: {
                    select: {
                        koleksi: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                            },
                        },
                    },
                },
            },
        });
    }

    findFavoriteUsersByKoleksi(koleksiId, tx = prisma) {
        return tx.userFavorite.findMany({
            where: { koleksiId },
            select: { userId: true },
        });
    }

    upsertEpisodeNotification(userId, episodeId, title, message, metadata, koleksiId, tx = prisma) {
        const now = new Date();
        return tx.userNotification.upsert({
            where: {
                userId_type_episodeId: {
                    userId,
                    type: 'animeEpisodeUpdate',
                    episodeId,
                },
            },
            update: {
                title,
                message,
                metadata,
                koleksiId,
                isRead: false,
                readAt: null,
            },
            create: {
                userId,
                type: 'animeEpisodeUpdate',
                title,
                message,
                metadata,
                koleksiId,
                episodeId,
                isRead: false,
                createdAt: now,
            },
        });
    }

    listBroadcasts({ skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.adminBroadcast.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                admin: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    countBroadcasts(tx = prisma) {
        return tx.adminBroadcast.count();
    }

    createBroadcast(adminId, payload, tx = prisma) {
        const now = new Date();
        return tx.adminBroadcast.create({
            data: {
                adminId,
                level: payload.level,
                title: payload.title,
                message: payload.message,
                isActive: payload.isActive ?? true,
                createdAt: now,
                updatedAt: now,
            },
        });
    }

    findAllNonAdminUsers(tx = prisma) {
        return tx.user.findMany({
            where: {
                roleId: { not: 1 },
            },
            select: {
                id: true,
            },
        });
    }

    upsertBroadcastNotification(userId, broadcastId, title, message, level, tx = prisma) {
        const now = new Date();
        return tx.userNotification.upsert({
            where: {
                userId_broadcastId: {
                    userId,
                    broadcastId,
                },
            },
            update: {
                type: 'adminBroadcast',
                title,
                message,
                metadata: { level },
                isRead: false,
                readAt: null,
            },
            create: {
                userId,
                type: 'adminBroadcast',
                title,
                message,
                metadata: { level },
                broadcastId,
                isRead: false,
                createdAt: now,
            },
        });
    }
}

module.exports = new UserLibraryRepository();
