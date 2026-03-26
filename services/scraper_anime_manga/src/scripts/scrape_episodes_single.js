#!/usr/bin/env node
'use strict';

/**
 * scrape_episodes_single.js
 * 
 * Standalone script to scrape episodes for a single koleksi.
 * Called by the backend when admin approves a mapping.
 * 
 * Usage: node scrape_episodes_single.js <koleksiId> <nineanimeId>
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

const prisma = require('../config/prisma');
const { logger } = require('../config/logger');
const { launchBrowser, getEpisodeList, sleep } = require('../scrape/anime/9anime');

async function main() {
    const [koleksiId, nineanimeId] = process.argv.slice(2);

    if (!koleksiId || !nineanimeId) {
        console.error('Usage: node scrape_episodes_single.js <koleksiId> <nineanimeId>');
        process.exit(1);
    }

    logger.info(`[EpisodeScrape] Starting episode scrape for koleksi=${koleksiId}, nineanimeId=${nineanimeId}`);

    // Get the animeDetailId for this koleksi
    const animeDetail = await prisma.animeDetail.findUnique({
        where: { koleksiId },
        select: { id: true },
    });

    if (!animeDetail) {
        logger.warn(`[EpisodeScrape] No AnimeDetail found for koleksi=${koleksiId}. Skipping.`);
        process.exit(0);
    }

    let browser;
    try {
        browser = await launchBrowser({});
        const episodes = await getEpisodeList(browser, nineanimeId);

        if (episodes.length === 0) {
            logger.warn(`[EpisodeScrape] No episodes found for nineanimeId=${nineanimeId}.`);
            process.exit(0);
        }

        let saved = 0;
        for (const ep of episodes) {
            try {
                let episode = await prisma.episode.upsert({
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

                let episodeSource = await prisma.episodeSource.upsert({
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

        logger.info(`[EpisodeScrape] Saved ${saved}/${episodes.length} episodes for koleksi=${koleksiId}`);
    } catch (error) {
        logger.error(`[EpisodeScrape] Fatal error for koleksi=${koleksiId}: ${error.message}`);
        process.exit(1);
    } finally {
        if (browser) await browser.close().catch(() => {});
        await prisma.$disconnect();
    }
}

main();
