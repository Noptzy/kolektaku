const prisma = require('../config/prisma');

class MappingRepository {
    findAllPending({ skip = 0, take = 20, status = 'pending', query = '' } = {}, tx = prisma) {
        const where = { pendingMapping: { status } };
        if (query) {
            where.OR = [
                { targetTitle: { contains: query, mode: 'insensitive' } },
                { pendingMapping: { scrapedTitle: { contains: query, mode: 'insensitive' } } }
            ];
        }
        return tx.mappingCandidate.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                pendingMapping: {
                    include: {
                        koleksi: {
                            select: { 
                                id: true, 
                                title: true, 
                                slug: true, 
                                posterUrl: true,
                                synopsis: true,
                                altTitles: true,
                                releaseYear: true,
                                animeDetail: { 
                                    select: { 
                                        season: true, 
                                        format: true, 
                                        totalEpisodes: true,
                                        _count: { select: { episodes: true } }
                                    } 
                                },
                                studios: { include: { studio: { select: { id: true, name: true } } } },
                                genres: { include: { genre: { select: { id: true, name: true } } } }
                            },
                        }
                    }
                }
            },
        });
    }

    bulkIgnore(mappingIds, tx = prisma) {
        return tx.pendingMapping.updateMany({
            where: { id: { in: mappingIds } },
            data: { status: 'ignored', updatedAt: new Date() }
        });
    }

    countPending({ status = 'pending', query = '' } = {}, tx = prisma) {
        const where = { pendingMapping: { status } };
        if (query) {
            where.OR = [
                { targetTitle: { contains: query, mode: 'insensitive' } },
                { pendingMapping: { scrapedTitle: { contains: query, mode: 'insensitive' } } }
            ];
        }
        return tx.mappingCandidate.count({ where });
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

    findKoleksiMappingByAnilistId(anilistId, tx = prisma) {
        return tx.koleksiMapping.findUnique({
            where: { anilistId }
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
