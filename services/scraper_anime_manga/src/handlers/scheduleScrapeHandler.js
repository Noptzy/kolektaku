'use strict';

const { logger } = require('../config/logger');
const prisma = require('../config/prisma');
const { launchBrowser, getEpisodeList, sleep } = require('../scrape/anime/9anime');

/**
 * Retry configuration per PRD:
 * Phase 1: 3 retries, 5 min apart
 * Phase 2: 5 retries, 5 min apart  
 * Total max: 8 retries over ~40 minutes
 */
const RETRY_PHASE_1 = { maxRetries: 3, delayMs: 5 * 60 * 1000 };
const RETRY_PHASE_2 = { maxRetries: 5, delayMs: 5 * 60 * 1000 };
const TOTAL_MAX_RETRIES = RETRY_PHASE_1.maxRetries + RETRY_PHASE_2.maxRetries;

/**
 * Handler: schedule_scrape
 * Triggered by backend cron when a scheduled anime episode is due.
 * Implements retry logic and admin/user notification.
 */
async function handleScheduleScrape(payload) {
    const { scheduleId, koleksiId, expectedEpisode, title } = payload;
    logger.info(`[ScheduleScrape] Starting for "${title}" Ep ${expectedEpisode} (scheduleId: ${scheduleId})`);

    // Load schedule record
    const schedule = await prisma.airingSchedule.findUnique({
        where: { id: scheduleId },
        include: {
            koleksi: {
                include: {
                    mapping: true,
                    animeDetail: true,
                }
            }
        }
    });

    if (!schedule) {
        logger.warn(`[ScheduleScrape] Schedule ${scheduleId} not found, skipping.`);
        return;
    }

    if (schedule.isScraped) {
        logger.info(`[ScheduleScrape] Schedule ${scheduleId} already scraped, skipping.`);
        return;
    }

    const nineanimeId = schedule.koleksi?.mapping?.nineanimeId;
    if (!nineanimeId) {
        logger.warn(`[ScheduleScrape] No 9anime mapping for "${title}", creating admin notification.`);
        await notifyAdmin(koleksiId, `Anime "${title}" tidak punya mapping 9anime. Tidak bisa scrape episode terjadwal.`);
        return;
    }

    const animeDetailId = schedule.koleksi?.animeDetail?.id;
    if (!animeDetailId) {
        logger.warn(`[ScheduleScrape] No animeDetail for "${title}", skipping.`);
        return;
    }

    // Retry loop
    let found = false;
    let retryCount = 0;
    let browser;

    try {
        browser = await launchBrowser({});

        while (retryCount < TOTAL_MAX_RETRIES && !found) {
            const phase = retryCount < RETRY_PHASE_1.maxRetries ? 1 : 2;
            const currentDelay = phase === 1 ? RETRY_PHASE_1.delayMs : RETRY_PHASE_2.delayMs;

            logger.info(`[ScheduleScrape] Attempt ${retryCount + 1}/${TOTAL_MAX_RETRIES} (Phase ${phase}) for "${title}" Ep ${expectedEpisode}`);

            try {
                const episodes = await getEpisodeList(browser, nineanimeId);

                // Check if the expected episode exists
                const targetEp = episodes.find(ep => Number(ep.episodeNumber) === Number(expectedEpisode));

                if (targetEp) {
                    found = true;
                    logger.info(`[ScheduleScrape] Found Ep ${expectedEpisode} for "${title}"!`);

                    // Upsert episode
                    const episode = await prisma.episode.upsert({
                        where: { animeId_episodeNumber: { animeId: animeDetailId, episodeNumber: expectedEpisode } },
                        update: { title: targetEp.title, updatedAt: new Date() },
                        create: {
                            animeId: animeDetailId,
                            episodeNumber: expectedEpisode,
                            title: targetEp.title || `Episode ${expectedEpisode}`,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                    });

                    // Upsert source
                    await prisma.episodeSource.upsert({
                        where: { episodeId_serverName_audio: { episodeId: episode.id, serverName: 'Kolektaku Stream 1', audio: 'sub' } },
                        update: { urlSource: targetEp.url, externalId: targetEp.nineanimeEpId },
                        create: {
                            episodeId: episode.id,
                            serverName: 'Kolektaku Stream 1',
                            audio: 'sub',
                            streamType: 'hls',
                            urlSource: targetEp.url,
                            externalId: targetEp.nineanimeEpId,
                            isScraper: true,
                            createdAt: new Date(),
                        },
                    });

                    // Mark schedule as scraped
                    await prisma.airingSchedule.update({
                        where: { id: scheduleId },
                        data: { isScraped: true, updatedAt: new Date() },
                    });

                    // Notify users who favorited this anime
                    await notifyFavoriteUsers(koleksiId, episode.id, title, expectedEpisode);

                    logger.info(`[ScheduleScrape] SUCCESS: "${title}" Ep ${expectedEpisode} saved.`);
                } else {
                    retryCount++;
                    logger.info(`[ScheduleScrape] Ep ${expectedEpisode} not found yet. Waiting ${currentDelay / 1000}s before retry...`);

                    if (retryCount < TOTAL_MAX_RETRIES) {
                        await sleep(currentDelay);
                    }
                }
            } catch (scrapeErr) {
                retryCount++;
                logger.error(`[ScheduleScrape] Scrape error on attempt ${retryCount}: ${scrapeErr.message}`);
                if (retryCount < TOTAL_MAX_RETRIES) {
                    await sleep(RETRY_PHASE_1.delayMs);
                }
            }
        }

        if (!found) {
            logger.error(`[ScheduleScrape] FAILED after ${TOTAL_MAX_RETRIES} retries for "${title}" Ep ${expectedEpisode}`);
            await notifyAdmin(koleksiId, `Gagal scrape "${title}" Episode ${expectedEpisode} setelah ${TOTAL_MAX_RETRIES} retry. Silakan cek manual.`);
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Create admin notification for schedule scrape failure.
 */
async function notifyAdmin(koleksiId, message) {
    try {
        const admins = await prisma.user.findMany({
            where: { role: { title: 'admin' } },
            select: { id: true },
        });

        for (const admin of admins) {
            await prisma.userNotification.create({
                data: {
                    userId: admin.id,
                    type: 'adminBroadcast',
                    title: 'Schedule Scrape Failed',
                    koleksiId,
                    message,
                    isRead: false,
                    createdAt: new Date(),
                },
            });
        }
    } catch (err) {
        logger.error(`[ScheduleScrape] Failed to notify admins: ${err.message}`);
    }
}

/**
 * Notify users who favorited this anime about the new episode.
 */
async function notifyFavoriteUsers(koleksiId, episodeId, title, episodeNumber) {
    try {
        const favorites = await prisma.userFavorite.findMany({
            where: { koleksiId },
            select: { userId: true },
        });

        if (favorites.length === 0) return;

        for (const fav of favorites) {
            try {
                await prisma.userNotification.create({
                    data: {
                        userId: fav.userId,
                        type: 'animeEpisodeUpdate',
                        title: `Episode Baru: ${title}`,
                        koleksiId,
                        episodeId,
                        message: `Episode ${episodeNumber} dari "${title}" sudah tersedia!`,
                        isRead: false,
                        createdAt: new Date(),
                    },
                });
            } catch (dupErr) {
                // Skip duplicate notification (unique constraint: userId + type + episodeId)
            }
        }

        logger.info(`[ScheduleScrape] Notified ${favorites.length} user(s) about new episode.`);
    } catch (err) {
        logger.error(`[ScheduleScrape] Failed to notify users: ${err.message}`);
    }
}

module.exports = { handleScheduleScrape };
