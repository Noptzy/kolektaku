const prisma = require('../config/prisma');

class AiringScheduleRepository {
    async findPendingSchedulesInRange(startDate, endDate) {
        return await prisma.airingSchedule.findMany({
            where: {
                airingAt: { 
                    gte: startDate,
                    lte: endDate 
                },
                isScraped: false,
            },
            include: {
                koleksi: {
                    select: { id: true, title: true, type: true },
                },
            },
        });
    }

    async findPendingSchedules(nowUtc) {
        return await prisma.airingSchedule.findMany({
            where: {
                airingAt: { lte: nowUtc },
                isScraped: false,
            },
            include: {
                koleksi: {
                    select: { id: true, title: true, type: true },
                },
            },
        });
    }

    async updateStatus(id, isScraped, nextAiringAt = null) {
        const data = { isScraped, updatedAt: new Date() };
        if (nextAiringAt) data.airingAt = nextAiringAt;

        return await prisma.airingSchedule.update({
            where: { id },
            data,
        });
    }

    async createOrUpdate(data) {
        const existing = await prisma.airingSchedule.findFirst({
            where: {
                koleksiId: data.koleksiId,
                episodeNumber: data.episodeNumber,
            },
        });

        if (existing) {
            return await prisma.airingSchedule.update({
                where: { id: existing.id },
                data: {
                    airingAt: data.airingAt,
                    isScraped: data.isScraped,
                    updatedAt: new Date(),
                },
            });
        }

        return await prisma.airingSchedule.create({
            data: {
                koleksiId: data.koleksiId,
                episodeNumber: data.episodeNumber,
                airingAt: data.airingAt,
                isScraped: data.isScraped,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
    }

    async getWeeklySchedules(startDate, endDate) {
        return await prisma.airingSchedule.findMany({
            where: {
                airingAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        posterUrl: true,
                        type: true,
                    },
                },
            },
            orderBy: {
                airingAt: 'asc',
            },
        });
    }
}

module.exports = new AiringScheduleRepository();
