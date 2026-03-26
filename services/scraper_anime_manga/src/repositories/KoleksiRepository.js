'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const prisma = require('../config/prisma');
const { logger } = require('../config/logger');

const SOURCE_NAME = '9anime';


async function getUnmappedAnime({ limit, offset = 0 } = {}) {
    try {
        return await prisma.koleksi.findMany({
            where: {
                koleksiType: 'anime',
                OR: [
                    { mapping: null },
                    { mapping: { nineanimeId: null } },
                ],
            },
            include: {
                mapping: true,
                animeDetail: true,
            },
            orderBy: { createdAt: 'asc' },
            skip: offset,
            ...(limit ? { take: limit } : {}),
        });
    } catch (error) {
        logger.error(`[KoleksiRepository] getUnmappedAnime failed: ${error.message}`);
        throw error;
    }
}


async function saveNineanimeMapping(koleksiId, nineanimeId) {
    try {
        return await prisma.koleksiMapping.upsert({
            where: { koleksiId },
            update: {
                nineanimeId,
                lastSyncAt: new Date(),
            },
            create: {
                koleksiId,
                nineanimeId,
                lastSyncAt: new Date(),
            },
        });
    } catch (error) {
        logger.error(`[KoleksiRepository] saveNineanimeMapping failed for ${koleksiId}: ${error.message}`);
        throw error;
    }
}


async function createPendingMapping({ koleksiId, scrapedTitle, sourceIdOrSlug }) {
    try {
        const pendingMapping = await prisma.pendingMapping.create({
            data: {
                sourceName: SOURCE_NAME,
                sourceIdOrSlug,
                scrapedTitle,
                status: 'pending',
                koleksiId,
                externalMetadata: null,
                workerId: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });
        logger.info(`[KoleksiRepository] Created pending mapping id=${pendingMapping.id}`);
        return pendingMapping;
    } catch (error) {
        logger.error(`[KoleksiRepository] createPendingMapping failed: ${error.message}`);
        throw error;
    }
}

async function createPendingMappingWithMetadata({
    koleksiId,
    scrapedTitle,
    sourceIdOrSlug,
    externalMetadata = null,
    workerId = null,
}) {
    try {
        const pendingMapping = await prisma.pendingMapping.create({
            data: {
                sourceName: SOURCE_NAME,
                sourceIdOrSlug,
                scrapedTitle,
                status: 'pending',
                koleksiId,
                externalMetadata,
                workerId,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        logger.info(`[KoleksiRepository] Created metadata pending mapping id=${pendingMapping.id}`);
        return pendingMapping;
    } catch (error) {
        logger.error(`[KoleksiRepository] createPendingMappingWithMetadata failed: ${error.message}`);
        throw error;
    }
}

async function createPendingMappingWithCandidates({
    pendingData,
    candidates = [],
}) {
    try {
        return await prisma.$transaction(async (tx) => {
            const pendingMapping = await tx.pendingMapping.create({
                data: {
                    sourceName: SOURCE_NAME,
                    sourceIdOrSlug: pendingData.sourceIdOrSlug,
                    scrapedTitle: pendingData.scrapedTitle,
                    status: 'pending',
                    koleksiId: pendingData.koleksiId,
                    externalMetadata: pendingData.externalMetadata || null,
                    workerId: pendingData.workerId ?? null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            if (candidates.length > 0) {
                await tx.mappingCandidate.createMany({
                    data: candidates.map((candidate) => ({
                        pendingMappingId: pendingMapping.id,
                        targetAnilistId: candidate.targetAnilistId ?? null,
                        targetTitle: candidate.targetTitle ?? null,
                        targetFormat: candidate.targetFormat ?? null,
                        targetReleaseYear: candidate.targetReleaseYear ?? null,
                        relationHint: candidate.relationHint ?? null,
                        similarityScore: candidate.similarityScore ?? null,
                        isApproved: false,
                        createdAt: new Date(),
                    })),
                });
            }

            return pendingMapping;
        });
    } catch (error) {
        logger.error(`[KoleksiRepository] createPendingMappingWithCandidates failed: ${error.message}`);
        throw error;
    }
}

async function countUnmappedAnime() {
    try {
        return await prisma.koleksi.count({
            where: {
                koleksiType: 'anime',
                OR: [
                    { mapping: null },
                    { mapping: { nineanimeId: null } },
                ],
            },
        });
    } catch (error) {
        return 0;
    }
}

module.exports = {
    getUnmappedAnime,
    saveNineanimeMapping,
    createPendingMapping,
    createPendingMappingWithMetadata,
    createPendingMappingWithCandidates,
    countUnmappedAnime,
};
