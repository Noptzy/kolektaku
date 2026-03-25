'use strict';
require('dotenv').config();

const fs = require('fs');
const prisma = require('../config/prisma');
const { launchBrowser } = require('../scrape/anime/9anime');
const { matchSingleAnime } = require('../services/MappingService');
const { syncEpisodesForAnime } = require('../services/EpisodeSyncService');
const { logger } = require('../config/logger');

const NARUTO_SHIPPUUDEN_ID = '019cdb36-d2dd-75ef-8279-a3efdb28524a';

async function main() {
    logger.info('=== Fix Naruto Shippuuden Mapping ===');

    try {
        await prisma.koleksiMapping.delete({ where: { koleksiId: NARUTO_SHIPPUUDEN_ID } });
        logger.info('Deleted old wrong mapping (was nineanimeId=677).');
    } catch (e) {
        logger.warn('No mapping to delete: ' + e.message);
    }

    const koleksi = await prisma.koleksi.findUnique({
        where: { id: NARUTO_SHIPPUUDEN_ID },
        include: { animeDetail: true }
    });
    logger.info(`Found: "${koleksi.title}"`);

    if (koleksi.animeDetail) {
        const delSrc = await prisma.episodeSource.deleteMany({
            where: { episode: { is: { animeId: koleksi.animeDetail.id } } }
        });
        const delEp = await prisma.episode.deleteMany({
            where: { animeId: koleksi.animeDetail.id }
        });
        logger.info(`Deleted ${delSrc.count} sources, ${delEp.count} episodes.`);
    }

    const browser = await launchBrowser();
    try {
        const kRecord = {
            id: koleksi.id,
            title: koleksi.title,
            slug: koleksi.slug,
            altTitles: koleksi.altTitles || [],
            koleksiType: koleksi.koleksiType,
            releaseYear: koleksi.releaseYear,
            animeDetail: koleksi.animeDetail
        };

        const result = await matchSingleAnime(browser, kRecord);
        logger.info('Match result: ' + JSON.stringify(result));

        if (result.status === 'matched' && result.nineanimeId) {
            logger.info('Syncing episodes...');
            kRecord.mapping = { nineanimeId: result.nineanimeId };
            const stats = await syncEpisodesForAnime(browser, kRecord);
            logger.info(`Done! ${stats.episodes} episodes, ${stats.sources} sources.`);
        }
    } finally {
        await browser.close();
    }
}

main()
    .then(() => logger.info('=== DONE ==='))
    .catch(err => logger.error('FATAL: ' + err.stack))
    .finally(() => process.exit(0));
