'use strict';

const { logger }    = require('../config/logger');
const nineanime     = require('../scrape/anime/9anime');
const episodeRepo   = require('../repositories/EpisodeRepository');
const { getWorkerTotal, getWorkerIndex, isOwnedByWorker } = require('../utils/workerShard');
const {
    createScrapeSession,
    addSuccessId,
    addFailureId,
    mergeSessionExtras,
    flushScrapeSession,
} = require('./ScrapeLogService');

const DELAY_BETWEEN_ANIME_MS = Number.parseInt(process.env.REQUEST_DELAY_MS || '1500', 10);
async function syncEpisodesForAnime(browser, koleksi, { dryRun = false } = {}) {
    const { mapping, animeDetail } = koleksi;
    const label = `[EpisodeSyncService] "${koleksi.title}"`;

    if (!mapping?.nineanimeId) {
        logger.warn(`${label} – Tidak punya nineanimeId, skip.`);
        return { episodes: 0, sources: 0 };
    }

    if (!animeDetail) {
        logger.warn(`${label} – Tidak punya animeDetail, skip.`);
        return { episodes: 0, sources: 0 };
    }

    const nineanimeId   = mapping.nineanimeId;
    const animeDetailId = animeDetail.id;

    logger.info(`${label} – Fetching episode list (nineanimeId=${nineanimeId})...`);
    const episodes = await nineanime.getEpisodeList(browser, nineanimeId);

    if (episodes.length === 0) {
        logger.warn(`${label} – Tidak ada episode ditemukan di 9anime.`);
        return { episodes: 0, sources: 0 };
    }

    logger.info(`${label} – ${episodes.length} episode(s) ditemukan.`);

    if (dryRun) {
        logger.info(`${label} – [DRY RUN] Would upsert ${episodes.length} episode(s).`);
        return { episodes: episodes.length, sources: 0 };
    }

    let totalSources = 0;

    for (let i = 0; i < episodes.length; i++) {
        const ep = episodes[i];
        logger.debug(`${label} – [${i + 1}/${episodes.length}] Ep ${ep.episodeNumber}`);

        const episodeRow = await episodeRepo.ensureEpisode(animeDetailId, ep.episodeNumber, ep.title);

        if (ep.url || ep.hasSub) {
            await episodeRepo.upsertEpisodeSource(episodeRow.id, {
                audio:      'sub',
                url:        ep.url || null,
                serverName: 'KolektakuStreaming',
                externalId: ep.nineanimeEpId,
                subtitles:  [],
            });
            totalSources++;
        }

        if (ep.hasDub && ep.url) {
            await episodeRepo.upsertEpisodeSource(episodeRow.id, {
                audio:      'dubEn',
                url:        ep.url,
                serverName: 'KolektakuStreaming',
                externalId: ep.nineanimeEpId,
            });
            totalSources++;
        }

    }

    logger.info(`${label} – Done. ${episodes.length} episode(s), ${totalSources} source(s) saved.`);
    return { episodes: episodes.length, sources: totalSources };
}


async function runEpisodeSyncPipeline({ limit, offset = 0, dryRun = false } = {}) {
    const workerTotal = getWorkerTotal(process.env.WORKER_TOTAL);
    const workerId = getWorkerIndex(process.env.NODE_APP_INSTANCE) % workerTotal;

    const total = await episodeRepo.countMappedAnimeWithoutEpisodes();
    logger.info(`[EpisodeSyncService] Total anime to sync: ${total}`);

    const batch = await episodeRepo.getMappedAnimeWithoutEpisodes({ limit, offset });
    const ownedBatch = batch.filter((koleksi) => isOwnedByWorker(koleksi.id, workerTotal, workerId));

    logger.info(
        `[EpisodeSyncService] Processing ${ownedBatch.length}/${batch.length} anime (dryRun=${dryRun}) on worker ${workerId}/${workerTotal}`,
    );

    const stats = {
        totalEpisodes: 0,
        totalSources: 0,
        errors: 0,
        skippedByShard: batch.length - ownedBatch.length,
        workerId,
        workerTotal,
    };

    const scrapeSession = createScrapeSession({
        sourceName: '9anime_episode_sync',
        workerId,
        context: {
            total,
            batchSize: batch.length,
            ownedBatchSize: ownedBatch.length,
            dryRun,
            offset,
            limit: limit || null,
        },
    });

    const browser = await nineanime.launchBrowser();
    let pipelineError = null;

    try {
        for (let i = 0; i < ownedBatch.length; i++) {
            const koleksi   = ownedBatch[i];
            const progress  = `[${i + 1}/${ownedBatch.length}]`;
            logger.info(`\n${progress} Syncing "${koleksi.title}"...`);

            try {
                const result = await syncEpisodesForAnime(browser, koleksi, { dryRun });
                stats.totalEpisodes += result.episodes;
                stats.totalSources  += result.sources;
                addSuccessId(scrapeSession, koleksi.id);
            } catch (err) {
                logger.error(`[EpisodeSyncService] Error syncing "${koleksi.title}": ${err.message}`);
                stats.errors++;
                addFailureId(scrapeSession, koleksi.id, err.message);
            }

            if (i < ownedBatch.length - 1) {
                await nineanime.sleep(DELAY_BETWEEN_ANIME_MS);
            }
        }
    } catch (error) {
        pipelineError = error;
        throw error;
    } finally {
        mergeSessionExtras(scrapeSession, { stats });

        await flushScrapeSession(scrapeSession, {
            errorMessage: pipelineError ? pipelineError.message : null,
            forceStatus: pipelineError ? 'error' : null,
        });

        await browser.close();
        logger.info('[EpisodeSyncService] Browser closed.');
    }

    logger.info(`[EpisodeSyncService] Pipeline complete.`, stats);
    return stats;
}

module.exports = { runEpisodeSyncPipeline, syncEpisodesForAnime };
