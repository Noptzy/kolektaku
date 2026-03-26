'use strict';

const prisma = require('../config/prisma');
const { logger } = require('../config/logger');
const { launchBrowser, getEpisodeList } = require('../scrape/anime/9anime');

/**
 * Service to scrape episodes for a single collection.
 * This runs in-process to avoid Node.js startup overhead.
 * 
 * @param {string} koleksiId 
 * @param {string} nineanimeId 
 */
async function scrapeEpisodesInProcess(koleksiId, nineanimeId) {
    logger.info(`[EpisodeScrape] Starting in-process scrape for koleksi=${koleksiId}, nineanimeId=${nineanimeId}`);

    // Get the animeDetailId for this koleksi
    const animeDetail = await prisma.animeDetail.findUnique({
        where: { koleksiId },
        select: { id: true },
    });

    if (!animeDetail) {
        logger.warn(`[EpisodeScrape] No AnimeDetail found for koleksi=${koleksiId}. Skipping.`);
        return { success: false, reason: 'AnimeDetail not found' };
    }

    let browser;
    try {
        // We still launch a browser per task to ensure clean state and avoid detection,
        // but we avoid the Node.js/Prisma initialization overhead.
        browser = await launchBrowser({});
        const episodes = await getEpisodeList(browser, nineanimeId);

        if (episodes.length === 0) {
            logger.warn(`[EpisodeScrape] No episodes found for nineanimeId=${nineanimeId}.`);
            return { success: true, saved: 0, total: 0 };
        }

        let saved = 0;
        for (const ep of episodes) {
            try {
                const episode = await prisma.episode.upsert({
                    where: {
                        animeId_episodeNumber: { animeId: animeDetail.id, episodeNumber: ep.episodeNumber }
                    },
                    update: { title: ep.title, updatedAt: new Date() },
                    create: {
                        animeId: animeDetail.id,
                        episodeNumber: ep.episodeNumber,
                        title: ep.title,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                await prisma.episodeSource.upsert({
                    where: {
                        episodeId_serverName_audio: { episodeId: episode.id, serverName: 'Kolektaku Stream 1', audio: 'sub' }
                    },
                    update: { urlSource: ep.url, externalId: ep.nineanimeEpId },
                    create: {
                        episodeId: episode.id,
                        serverName: 'Kolektaku Stream 1',
                        audio: 'sub',
                        streamType: 'hls',
                        urlSource: ep.url,
                        externalId: ep.nineanimeEpId,
                        isScraper: true,
                        createdAt: new Date(),
                    },
                });

                saved++;
            } catch (error) {
                logger.warn(`[EpisodeScrape] Failed to save episode ${ep.episodeNumber}: ${error.message}`);
            }
        }

        logger.info(`[EpisodeScrape] Successfully saved ${saved}/${episodes.length} episodes for koleksi=${koleksiId}`);
        return { success: true, saved, total: episodes.length };
    } catch (error) {
        logger.error(`[EpisodeScrape] Fatal error: ${error.message}`);
        return { success: false, error: error.message };
    } finally {
        if (browser) await browser.close().catch(() => {});
        // We DO NOT disconnect prisma here because the worker should keep the connection alive.
    }
}

module.exports = { scrapeEpisodesInProcess };
