#!/usr/bin/env node
'use strict';

/**
 * seed_episodes_batch.js
 * 
 * PM2 cluster script: scrapes episodes for anime that are
 * already mapped to 9anime but don't have episodes yet.
 * 
 * Delegates to EpisodeSyncService.runEpisodeSyncPipeline().
 * Run via: npm run pm2:data:seed:eps
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const { logger } = require('../config/logger');
const { runEpisodeSyncPipeline } = require('../services/EpisodeSyncService');

async function main() {
    const workerIndex = parseInt(process.env.NODE_APP_INSTANCE || '0', 10);
    const workerTotal = parseInt(process.env.WORKER_TOTAL || '5', 10);

    logger.info(`[SeedEpisodes] Worker ${workerIndex}/${workerTotal} starting episode sync pipeline...`);

    try {
        const stats = await runEpisodeSyncPipeline();
        logger.info(`[SeedEpisodes] Worker ${workerIndex} finished.`, stats);
    } catch (error) {
        logger.error(`[SeedEpisodes] Worker ${workerIndex} pipeline failed:`, error.message);
        process.exit(1);
    }
}

main()
    .then(() => {
        logger.info('[SeedEpisodes] Done.');
        process.exit(0);
    })
    .catch((err) => {
        logger.error('[SeedEpisodes] Fatal:', err.message);
        process.exit(1);
    });
