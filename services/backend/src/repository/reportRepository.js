const prisma = require('../config/prisma');

class ReportRepository {
    createReport({ userId, episodeId, category, message }, tx = prisma) {
        return tx.episodeReport.upsert({
            where: {
                userId_episodeId: {
                    userId,
                    episodeId
                }
            },
            update: {
                category,
                message,
                status: 'pending',
                resolvedAt: null,
                createdAt: new Date(),
            },
            create: {
                userId,
                episodeId,
                category,
                message,
                status: 'pending',
                createdAt: new Date(),
            }
        });
    }

    findByEpisode(episodeId, tx = prisma) {
        return tx.episodeReport.findMany({
            where: { episodeId },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    findByUser(userId, tx = prisma) {
        return tx.episodeReport.findMany({
            where: { userId },
            include: {
                episode: { 
                    include: {
                        anime: { 
                            include: {
                                koleksi: { select: { title: true, posterUrl: true, slug: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    findAll({ status, skip = 0, take = 20 } = {}, tx = prisma) {
        const where = {};
        if (status) where.status = status.toLowerCase();

        return tx.episodeReport.findMany({
            where,
            skip,
            take,
            include: {
                user: { select: { id: true, name: true, email: true } },
                episode: { 
                    include: {
                        anime: { 
                            include: {
                                koleksi: { select: { title: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    countAll({ status } = {}, tx = prisma) {
        const where = {};
        if (status) where.status = status.toLowerCase();
        
        return tx.episodeReport.count({ where });
    }

    updateStatus(id, status, tx = prisma) {
        const data = { status: status.toLowerCase() };
        if (status === 'resolved') {
            data.resolvedAt = new Date();
        }
        return tx.episodeReport.update({
            where: { id },
            data,
        });
    }

    deleteReport(id, tx = prisma) {
        return tx.episodeReport.delete({
            where: { id }
        });
    }
}

module.exports = new ReportRepository();
