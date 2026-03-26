'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const prisma = require('../config/prisma');
const { logger } = require('../config/logger');


async function getMappedAnimeWithoutEpisodes({ limit, offset = 0 } = {}) {
    return prisma.koleksi.findMany({
        where: {
            koleksiType: 'anime',
            mapping: { nineanimeId: { not: null } },
            animeDetail: {
                episodes: { none: {} },
            },
        },
        include: {
            mapping:     true,
            animeDetail: true,
        },
        orderBy: { createdAt: 'asc' },
        skip:    offset,
        ...(limit ? { take: limit } : {}),
    });
}


async function countMappedAnimeWithoutEpisodes() {
    return prisma.koleksi.count({
        where: {
            koleksiType: 'anime',
            mapping: { nineanimeId: { not: null } },
            animeDetail: {
                episodes: { none: {} },
            },
        },
    });
}


async function ensureEpisode(animeDetailId, episodeNumber, title) {
    const existing = await prisma.episode.findFirst({
        where: {
            animeId:       animeDetailId,
            episodeNumber: episodeNumber,
        },
    });
    if (existing) return existing;

    return prisma.episode.create({
        data: {
            animeId:       animeDetailId,
            episodeNumber: episodeNumber,
            title:         title || `Episode ${episodeNumber}`,
            createdAt:     new Date(),
            updatedAt:     new Date(),
        },
    });
}


async function upsertEpisodeSource(episodeId, { audio, url, serverName = '9anime', externalId, subtitles }) {
    const existing = await prisma.episodeSource.findFirst({
        where: { episodeId, audio },
    });

    if (existing) {
        return prisma.episodeSource.update({
            where:  { id: existing.id },
            data: {
                urlSource:       url || null,
                externalId:      externalId || existing.externalId,
                subtitleTracks:  subtitles  || existing.subtitleTracks,
            },
        });
    }

    return prisma.episodeSource.create({
        data: {
            episodeId,
            serverName,
            audio,
            streamType:     'hls',
            urlSource:      url || null,
            externalId:     externalId || null,
            subtitleTracks: subtitles  || null,
            isScraper:      true,
            createdAt:      new Date(),
        },
    });
}

module.exports = {
    getMappedAnimeWithoutEpisodes,
    countMappedAnimeWithoutEpisodes,
    ensureEpisode,
    upsertEpisodeSource,
};
