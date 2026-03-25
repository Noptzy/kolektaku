'use strict';

require('dotenv').config();
const stringSimilarity = require('string-similarity');
const { logger } = require('../config/logger');
const { openBrowser, searchAnimeByName, scrapeAnimeDetails } = require('../scrape/anime/9anime');
const repo = require('../repositories/KoleksiRepository');
const { syncEpisodesForAnime } = require('./EpisodeSyncService');
const { getWorkerIndex, getWorkerTotal, isOwnedByWorker } = require('../utils/workerShard');
const {
    createScrapeSession,
    addSuccessId,
    addFailureId,
    addWarning,
    addWarningId,
    mergeSessionExtras,
    flushScrapeSession,
} = require('./ScrapeLogService');

const AUTO_MAP_THRESHOLD = 0.95;
const CANDIDATE_THRESHOLD = 0.70;
const REQUEST_DELAY_MS = 2000;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFingerprint(title) {
    if (!title) return { base: '', nums: [], flags: {} };

    const normalized = String(title).toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const nums = normalized.match(/\d+/g) || [];
    const flags = {
        season: /\bseason\b/.test(normalized),
        part: /\bpart\b/.test(normalized),
        cour: /\bcour\b/.test(normalized),
        movie: /\bmovie\b|\bfilm\b/.test(normalized),
        ova: /\bova\b|\boad\b/.test(normalized),
        final: /\bfinal\b/.test(normalized),
    };

    return { base: normalized, nums, flags };
}

function calculatePenalty(target, candidate) {
    const a = extractFingerprint(target);
    const b = extractFingerprint(candidate);

    let penalty = 0;

    if (a.nums.length || b.nums.length) {
        const numsA = a.nums.join(',');
        const numsB = b.nums.join(',');
        if (numsA !== numsB) penalty += 0.12;
    }

    ['season', 'part', 'cour', 'movie', 'ova', 'final'].forEach((k) => {
        if (a.flags[k] !== b.flags[k]) penalty += 0.04;
    });

    return Math.min(0.3, penalty);
}

function calculateBestScore(targetTitle, candidateObj = {}) {
    const candidateTitles = [
        candidateObj.title,
        candidateObj.japanese_title,
        candidateObj.english_title,
        candidateObj.romaji_title,
        ...(Array.isArray(candidateObj.alternative_titles) ? candidateObj.alternative_titles : []),
    ].filter(Boolean);

    if (!candidateTitles.length) return 0;

    let best = 0;
    for (const candidateTitle of candidateTitles) {
        const base = stringSimilarity.compareTwoStrings(
            String(targetTitle || '').toLowerCase(),
            String(candidateTitle).toLowerCase(),
        );

        const finalScore = Math.max(0, base - calculatePenalty(targetTitle, candidateTitle));
        if (finalScore > best) best = finalScore;
    }

    return Number(best.toFixed(4));
}

function resolveRoute(koleksi, topScore) {
    const status = String(koleksi?.status || '').toUpperCase();
    if (status === 'NOT_YET_RELEASED') {
        return 'candidate';
    }

    if (topScore > AUTO_MAP_THRESHOLD) {
        return 'auto';
    }

    if (topScore >= CANDIDATE_THRESHOLD) {
        return 'candidate';
    }

    return 'pending';
}

function buildExternalMetadata(koleksi, searchedTitle, rankedResults = [], reason) {
    const top = rankedResults[0];
    return {
        source: '9anime',
        reason,
        searchedTitle,
        koleksiStatus: koleksi?.status || null,
        sourceStatus: top?.result?.status || null,
        tags: top?.result?.tags || top?.result?.genres || [],
        topScore: top?.score ?? null,
        candidates: rankedResults.slice(0, 5).map((entry) => ({
            id: entry.result?.id || null,
            title: entry.result?.title || null,
            slug: entry.result?.slug || null,
            url: entry.result?.url || null,
            similarityScore: entry.score,
            status: entry.result?.status || null,
            tags: entry.result?.tags || entry.result?.genres || [],
        })),
    };
}

function buildMappingCandidates(koleksi, rankedResults = []) {
    return rankedResults.slice(0, 5).map((entry) => ({
        targetAnilistId: koleksi?.mapping?.anilistId ?? null,
        targetTitle: entry.result?.title || null,
        targetFormat: entry.result?.type || null,
        targetReleaseYear: Number.isFinite(entry.result?.year) ? entry.result.year : null,
        relationHint: entry.result?.url || entry.result?.slug || null,
        similarityScore: entry.score,
    }));
}

async function createPendingWithReason({ koleksi, searchedTitle, rankedResults, reason, workerId, withCandidates = false }) {
    const pendingData = {
        koleksiId: koleksi.id,
        scrapedTitle: searchedTitle,
        sourceIdOrSlug: rankedResults[0]?.result?.id || null,
        externalMetadata: buildExternalMetadata(koleksi, searchedTitle, rankedResults, reason),
        workerId,
    };

    if (withCandidates) {
        return repo.createPendingMappingWithCandidates({
            pendingData,
            candidates: buildMappingCandidates(koleksi, rankedResults),
        });
    }

    return repo.createPendingMappingWithMetadata(pendingData);
}

async function matchSingleAnime(browser, koleksi, options = {}) {
    const workerId = options.workerId ?? null;
    const sourceTitles = [
        koleksi.title,
        koleksi.englishTitle,
        koleksi?.animeDetail?.synopsis,
        ...(Array.isArray(koleksi.altTitles) ? koleksi.altTitles : []),
    ].filter(Boolean);

    const primarySearchTitle = sourceTitles[0];
    let searchResults = await searchAnimeByName(browser, primarySearchTitle, { limit: 10 });

    if ((!searchResults || searchResults.length === 0) && Array.isArray(koleksi.altTitles)) {
        for (const altTitle of koleksi.altTitles) {
            if (!altTitle || String(altTitle).trim().toLowerCase() === String(primarySearchTitle).trim().toLowerCase()) {
                continue;
            }

            const altResults = await searchAnimeByName(browser, altTitle, { limit: 10 });
            if (altResults && altResults.length > 0) {
                searchResults = altResults;
                break;
            }
        }
    }

    if (!searchResults || searchResults.length === 0) {
        const pendingMapping = await createPendingWithReason({
            koleksi,
            searchedTitle: primarySearchTitle,
            rankedResults: [],
            reason: 'no_search_result',
            workerId,
            withCandidates: false,
        });

        return {
            matched: false,
            mappingType: 'pending',
            reason: 'no-search-results',
            pendingMappingId: pendingMapping.id,
        };
    }

    const ranked = searchResults
        .map((result) => ({
            result,
            score: calculateBestScore(primarySearchTitle, result),
        }))
        .sort((a, b) => b.score - a.score);

    const top = ranked[0];
    const route = resolveRoute(koleksi, top.score);

    if (route === 'auto') {
        let nineanimeId = top.result.id || null;

        if (!nineanimeId && top.result.slug) {
            const detail = await scrapeAnimeDetails(browser, `https://9animetv.to/watch/${top.result.slug}`);
            nineanimeId = detail?.id || null;
        }

        if (!nineanimeId) {
            const pendingMapping = await createPendingWithReason({
                koleksi,
                searchedTitle: primarySearchTitle,
                rankedResults: ranked,
                reason: 'auto_route_missing_source_id',
                workerId,
                withCandidates: true,
            });

            return {
                matched: false,
                mappingType: 'candidate',
                reason: 'missing-source-id',
                pendingMappingId: pendingMapping.id,
                bestScore: top.score,
            };
        }

        await repo.saveNineanimeMapping(koleksi.id, nineanimeId);

        return {
            matched: true,
            mappingType: 'auto',
            sourceId: nineanimeId,
            bestScore: top.score,
            title: top.result.title,
        };
    }

    if (route === 'candidate') {
        const reason = String(koleksi?.status || '').toUpperCase() === 'NOT_YET_RELEASED'
            ? 'not_yet_released_guard'
            : 'candidate_threshold';

        const pendingMapping = await createPendingWithReason({
            koleksi,
            searchedTitle: primarySearchTitle,
            rankedResults: ranked,
            reason,
            workerId,
            withCandidates: true,
        });

        return {
            matched: false,
            mappingType: 'candidate',
            reason,
            pendingMappingId: pendingMapping.id,
            bestScore: top.score,
        };
    }

    const pendingMapping = await createPendingWithReason({
        koleksi,
        searchedTitle: primarySearchTitle,
        rankedResults: ranked,
        reason: 'low_similarity',
        workerId,
        withCandidates: false,
    });

    return {
        matched: false,
        mappingType: 'pending',
        reason: 'low-similarity',
        pendingMappingId: pendingMapping.id,
        bestScore: top.score,
    };
}

async function runMappingPipeline({ limit, offset = 0 } = {}) {
    const workerTotal = getWorkerTotal(process.env.WORKER_TOTAL);
    const workerId = getWorkerIndex(process.env.NODE_APP_INSTANCE);

    logger.info(`[MappingService] Starting mapping pipeline with worker ${workerId}/${workerTotal}`);

    const total = await repo.countUnmappedAnime();
    const animeList = await repo.getUnmappedAnime({ limit, offset });

    const session = createScrapeSession({
        sourceName: '9anime_mapping',
        workerId,
        context: {
            totalUnmapped: total,
            batchSize: animeList.length,
            offset,
            limit: limit || null,
            workerTotal,
        },
    });

    const stats = {
        total,
        processed: 0,
        mapped: 0,
        candidate: 0,
        pending: 0,
        failed: 0,
        skippedByShard: 0,
        workerId,
        workerTotal,
    };

    let browser;
    let pipelineError = null;

    try {
        browser = await openBrowser();

        for (const koleksi of animeList) {
            if (!isOwnedByWorker(koleksi.id, workerTotal, workerId)) {
                stats.skippedByShard += 1;
                continue;
            }

            stats.processed += 1;

            try {
                const result = await matchSingleAnime(browser, koleksi, { workerId });

                if (result.matched) {
                    stats.mapped += 1;
                    addSuccessId(session, koleksi.id);

                    try {
                        await syncEpisodesForAnime(browser, { ...koleksi, mapping: { nineanimeId: result.sourceId } });
                    } catch (episodeError) {
                        addWarning(session, {
                            type: 'episode_sync_failed',
                            koleksiId: koleksi.id,
                            message: episodeError.message,
                        });
                        addWarningId(session, koleksi.id);
                    }
                } else if (result.mappingType === 'candidate') {
                    stats.candidate += 1;
                    addWarningId(session, result.pendingMappingId || koleksi.id);
                } else {
                    stats.pending += 1;
                    addWarningId(session, result.pendingMappingId || koleksi.id);
                }

                await delay(REQUEST_DELAY_MS);
            } catch (itemError) {
                stats.failed += 1;
                addFailureId(session, koleksi.id, itemError.message);
                logger.error(`[MappingService] Failed mapping koleksi ${koleksi.id}: ${itemError.message}`);
            }
        }
    } catch (error) {
        pipelineError = error;
        logger.error(`[MappingService] Pipeline failed: ${error.message}`);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }

        mergeSessionExtras(session, { stats });
        await flushScrapeSession(session, {
            errorMessage: pipelineError ? pipelineError.message : null,
            forceStatus: pipelineError ? 'error' : null,
        });
    }

    return stats;
}

module.exports = {
    matchSingleAnime,
    runMappingPipeline,
};
