'use strict';

const { logger } = require('../config/logger');
const axios = require('axios');
const prisma = require('../config/prisma');
const { transformMedia, upsertMedia } = require('../seeds/seedAnilist');

/**
 * Handler: manual_add
 * Triggered by admin from dashboard when manually adding anime via AniList URL.
 */
async function handleManualAdd(payload) {
    logger.info(`[ManualAdd] Processing AniList ID: ${payload.anilistId}`);

    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          title { romaji english native }
          type format status description
          season seasonYear episodes duration
          coverImage { large extraLarge }
          bannerImage
          genres synonyms isAdult
          averageScore
          trailer { id site thumbnail }
        }
      }
    `;

    const variables = { id: payload.anilistId };

    try {
        const response = await axios.post('https://graphql.anilist.co', { query, variables }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        const item = response.data?.data?.Media;
        if (!item) {
            logger.error(`[ManualAdd] AniList item not found: ${payload.anilistId}`);
            return;
        }

        const mappedData = transformMedia(item, 'anime');
        const insertedKoleksiId = await upsertMedia(mappedData);
        logger.info(`[ManualAdd] Success: ${item.title?.romaji || 'Unknown'} (ID: ${insertedKoleksiId})`);

        if (payload.adminId) {
            await prisma.adminAuditLog.create({
                data: {
                    adminId: payload.adminId,
                    action: 'SCRAPE_MANUAL_ADD_SUCCESS',
                    entityType: 'Koleksi',
                    entityId: insertedKoleksiId,
                    changes: { message: 'Successfully inserted/updated koleksi data', anilistId: payload.anilistId },
                    createdAt: new Date()
                }
            });
        }
    } catch (e) {
        logger.error(`[ManualAdd] Failed for AniList ID ${payload.anilistId}:`, e?.response?.data || e.message);
        if (payload.adminId) {
            await prisma.adminAuditLog.create({
                data: {
                    adminId: payload.adminId,
                    action: 'SCRAPE_MANUAL_ADD_FAILED',
                    entityType: 'Koleksi',
                    changes: { error: e.message || String(e), anilistId: payload.anilistId },
                    createdAt: new Date()
                }
            });
        }
    }
}

module.exports = { handleManualAdd };
