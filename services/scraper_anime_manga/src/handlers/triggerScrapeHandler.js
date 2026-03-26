'use strict';

const { logger } = require('../config/logger');
const prisma = require('../config/prisma');
const cp = require('child_process');
const path = require('path');

const { scrapeEpisodesInProcess } = require('../services/episodeScraperService');

/**
 * Handler: trigger_scrape
 * Triggered by admin when clicking "Scrape Episode" or "Scrape Detail" on a specific anime.
 */
async function handleTriggerScrape(payload) {
    logger.info(`[TriggerScrape] Starting for ${payload.animeId} (Type: ${payload.type})`);

    try {
        if (payload.type === 'episodes') {
            const mapping = await prisma.koleksiMapping.findUnique({ where: { koleksiId: payload.animeId } });
            if (!mapping || !mapping.nineanimeId) {
                throw new Error('nineanimeId not found! Pastikan mapping 9anime sudah ada.');
            }

            logger.info(`[TriggerScrape] Running in-process scrape for KoleksiId: ${payload.animeId}`);
            await scrapeEpisodesInProcess(payload.animeId, mapping.nineanimeId);

            if (payload.adminId) {
                await prisma.adminAuditLog.create({
                    data: {
                        adminId: payload.adminId,
                        action: 'SCRAPE_TRIGGER_SUCCESS',
                        entityType: 'Koleksi',
                        entityId: payload.animeId,
                        changes: { message: 'Successfully scraped episodes', type: 'episodes' },
                        createdAt: new Date()
                    }
                });
            }
        } else if (payload.type === 'detail') {
            if (!payload.anilistId) {
                throw new Error('Anilist ID is missing, cannot scrape detail.');
            }
            logger.info(`[TriggerScrape] Delegating detail scrape to ManualAdd handler...`);
            const { handleManualAdd } = require('./manualAddHandler');
            await handleManualAdd({ anilistId: payload.anilistId, adminId: payload.adminId });
        }
    } catch (error) {
        logger.error(`[TriggerScrape] Error: ${error.message}`);
        if (payload.adminId && payload.animeId) {
            try {
                await prisma.adminAuditLog.create({
                    data: {
                        adminId: payload.adminId,
                        action: 'SCRAPE_TRIGGER_FAILED',
                        entityType: 'Koleksi',
                        entityId: payload.animeId,
                        changes: { error: error.message },
                        createdAt: new Date()
                    }
                });
            } catch (auditErr) {
                logger.error(`[TriggerScrape] Audit log error: ${auditErr.message}`);
            }
        }
    }
}

module.exports = { handleTriggerScrape };
