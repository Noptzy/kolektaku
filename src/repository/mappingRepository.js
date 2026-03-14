const prisma = require('../config/prisma');

class MappingRepository {
    findAllPending({ skip = 0, take = 20, status = 'pending', query = '' } = {}, tx = prisma) {
        const where = { status };
        if (query) {
            where.OR = [
                { sourceIdOrSlug: { contains: query, mode: 'insensitive' } },
                { scrapedTitle: { contains: query, mode: 'insensitive' } }
            ];
        }
        return tx.pendingMapping.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                koleksi: {
                    select: { id: true, title: true, slug: true, posterUrl: true },
                },
                candidates: {
                    orderBy: { similarityScore: 'desc' },
                    take: 5,
                },
            },
        });
    }

    countPending({ status = 'pending', query = '' } = {}, tx = prisma) {
        const where = { status };
        if (query) {
            where.OR = [
                { sourceIdOrSlug: { contains: query, mode: 'insensitive' } },
                { scrapedTitle: { contains: query, mode: 'insensitive' } }
            ];
        }
        return tx.pendingMapping.count({ where });
    }

    findById(id, tx = prisma) {
        return tx.pendingMapping.findUnique({
            where: { id },
            include: {
                koleksi: {
                    select: { id: true, title: true, slug: true, posterUrl: true, type: true },
                },
                candidates: {
                    orderBy: { similarityScore: 'desc' },
                },
            },
        });
    }

    updateStatus(id, status, koleksiId = null, tx = prisma) {
        const data = { status, updatedAt: new Date() };
        if (koleksiId) data.koleksiId = koleksiId;
        return tx.pendingMapping.update({ where: { id }, data });
    }

    approveCandidate(candidateId, tx = prisma) {
        return tx.mappingCandidate.update({
            where: { id: candidateId },
            data: { isApproved: true },
        });
    }

    async connectMapping(koleksiId, anilistId, nineanimeId = null, tx = prisma) {
        return tx.koleksiMapping.upsert({
            where: { koleksiId },
            update: {
                anilistId: anilistId || undefined,
                nineanimeId: nineanimeId || undefined,
                lastSyncAt: new Date(),
            },
            create: {
                koleksiId,
                anilistId: anilistId || null,
                nineanimeId: nineanimeId || null,
                lastSyncAt: new Date(),
            },
        });
    }

    disconnectMapping(koleksiId, tx = prisma) {
        return tx.koleksiMapping.delete({ where: { koleksiId } }).catch(() => null);
    }
}

module.exports = new MappingRepository();
