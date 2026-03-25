#!/usr/bin/env node
'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const prisma = require('../config/prisma');
const { logger } = require('../config/logger');
const {
    launchBrowser,
    searchAnime,
    getEpisodeList,
    sleep,
} = require('../scrape/anime/9anime');
const StringSimilarityService = require('../services/StringSimilarityService');
const {
    createScrapeSession,
    addSuccessId,
    addFailureId,
    addWarning,
    addWarningId,
    mergeSessionExtras,
    flushScrapeSession,
} = require('../services/ScrapeLogService');

// ────────────────────────────────────────────
//  Configuration
// ────────────────────────────────────────────
const MAX_CANDIDATES = parseInt(process.env.SEED_MAX_CANDIDATES || '5', 10);
const MAX_SEARCH_PAGES = parseInt(process.env.SEED_MAX_SEARCH_PAGES || '3', 10);
const SOURCE_NAME = '9anime_phase1_seed';
const ENABLE_PREMIUM_PROXY = /^(1|true|yes)$/i.test(
    String(process.env.ENABLE_PREMIUM_PROXY || '0'),
);
const SKIP_SEARCH_PREFLIGHT = /^(1|true|yes)$/i.test(
    String(process.env.SKIP_SEARCH_PREFLIGHT || '0'),
);

// ────────────────────────────────────────────
//  Proxy Management
// ────────────────────────────────────────────
function parseProxyList(raw) {
    return String(raw || '')
        .split(/[\n,;]+/)
        .map((e) => e.trim())
        .filter(Boolean);
}

function loadProxyListFromFrontendSource() {
    const fallbackFile = path.resolve(
        __dirname,
        '../../',
        '../frontend/src/app/proxy/route2.js',
    );
    if (!fs.existsSync(fallbackFile)) return [];

    const content = fs.readFileSync(fallbackFile, 'utf8');
    const match = content.match(
        /const\s+PREMIUM_PROXIES\s*=\s*\[([\s\S]*?)\];/,
    );
    if (!match) return [];

    const items = [];
    const re = /['"]([^'"\n]+)['"]/g;
    let m = re.exec(match[1]);
    while (m) {
        items.push(m[1].trim());
        m = re.exec(match[1]);
    }
    return items.filter(Boolean);
}

function getPremiumProxies() {
    const fromEnv = parseProxyList(process.env.PREMIUM_PROXIES);
    return fromEnv.length > 0 ? fromEnv : loadProxyListFromFrontendSource();
}

function assignWorkerProxies(proxies, workerIndex, perWorker = 2) {
    if (proxies.length === 0) return [];
    const assigned = [];
    for (let i = 0; i < perWorker; i++) {
        assigned.push(proxies[(workerIndex * perWorker + i) % proxies.length]);
    }
    return [...new Set(assigned)];
}

function redactProxy(proxyUrl) {
    try {
        const u = new URL(proxyUrl);
        return `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ''}`;
    } catch {
        return 'invalid-proxy';
    }
}

function buildProxyAttemptOrder(workerProxies, preferred) {
    if (!Array.isArray(workerProxies) || workerProxies.length === 0)
        return [null];
    const order = preferred ? [preferred] : [];
    for (const p of workerProxies) {
        if (!order.includes(p)) order.push(p);
    }
    return order;
}

function isRetryableProxyError(error) {
    const msg = String(error?.message || '').toUpperCase();
    return (
        msg.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
        msg.includes('ERR_PROXY_CONNECTION_FAILED') ||
        msg.includes('ERR_PROXY_CERTIFICATE_INVALID') ||
        msg.includes('ERR_NO_SUPPORTED_PROXIES') ||
        msg.includes('PROXY')
    );
}

// ────────────────────────────────────────────
//  Database Helpers (Single Responsibility)
// ────────────────────────────────────────────
function isMALConflictError(error) {
    if (!error || error.code !== 'P2002') return false;
    const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target || error.message || '');
    return (
        target.includes('myanimelist_id') || target.includes('myanimelistId')
    );
}

async function fetchOwnedKoleksi(workerTotal, workerIndex) {
    return prisma.$queryRaw`
        SELECT
            k.id,
            k.title,
            k.status,
            k.release_year AS "releaseYear",
            k.alt_titles   AS "altTitles",
            ad.id          AS "animeDetailId",
            ad.format      AS "format",
            ad.total_episodes AS "totalEpisodes",
            ad.romaji      AS "romaji"
        FROM koleksi k
        LEFT JOIN koleksi_mappings km ON km.koleksi_id = k.id
        LEFT JOIN anime_detail ad ON ad.koleksi_id = k.id
        WHERE k.koleksi_type = 'anime'
          AND (km.nineanime_id IS NULL OR km.nineanime_id = '')
          AND (((hashtext(k.id::text) % ${workerTotal}) + ${workerTotal}) % ${workerTotal}) = ${workerIndex}
        ORDER BY k.created_at ASC
    `;
}

async function saveNineanimeAutoMap(koleksiId, nineanimeId) {
    return prisma.koleksiMapping.upsert({
        where: { koleksiId },
        update: { nineanimeId, lastSyncAt: new Date() },
        create: { koleksiId, nineanimeId, lastSyncAt: new Date() },
    });
}

async function createPendingWithCandidates({
    koleksi,
    workerId,
    reason,
    scoredResults,
}) {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
        const pending = await tx.pendingMapping.create({
            data: {
                sourceName: '9anime',
                sourceIdOrSlug: scoredResults[0]?.nineanimeId || null,
                scrapedTitle: koleksi.title,
                status: 'pending',
                koleksiId: koleksi.id,
                workerId,
                createdAt: now,
                updatedAt: now,
                externalMetadata: {
                    reason,
                    bestScore: scoredResults[0]?.score || null,
                    workerMode: SOURCE_NAME,
                },
            },
        });

        const rows = scoredResults.slice(0, MAX_CANDIDATES).map((entry) => ({
            pendingMappingId: pending.id,
            targetAnilistId: null,
            targetTitle:
                entry.title || entry.japaneseTitle || entry.slug || null,
            targetFormat: entry.type || null,
            targetReleaseYear: null,
            relationHint: '9anime_seed_phase1',
            similarityScore: Number(entry.score.toFixed(6)),
            isApproved: false,
            createdAt: now,
        }));

        if (rows.length > 0) {
            await tx.mappingCandidate.createMany({ data: rows });
        }

        return pending;
    });
}

async function createPendingWithoutCandidate({
    koleksi,
    workerId,
    reason,
    bestScore = null,
}) {
    const now = new Date();
    return prisma.pendingMapping.create({
        data: {
            sourceName: '9anime',
            sourceIdOrSlug: null,
            scrapedTitle: koleksi.title,
            status: 'pending',
            koleksiId: koleksi.id,
            workerId,
            createdAt: now,
            updatedAt: now,
            externalMetadata: { reason, bestScore, workerMode: SOURCE_NAME },
        },
    });
}

async function saveEpisodeBatch(animeDetailId, episodes) {
    if (!animeDetailId || !Array.isArray(episodes) || episodes.length === 0)
        return 0;

    let saved = 0;
    for (const ep of episodes) {
        try {
            let episode = await prisma.episode.findFirst({
                where: {
                    animeId: animeDetailId,
                    episodeNumber: ep.episodeNumber,
                },
            });

            if (episode) {
                episode = await prisma.episode.update({
                    where: { id: episode.id },
                    data: { title: ep.title, updatedAt: new Date() },
                });
            } else {
                episode = await prisma.episode.create({
                    data: {
                        animeId: animeDetailId,
                        episodeNumber: ep.episodeNumber,
                        title: ep.title,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });
            }

            let episodeSource = await prisma.episodeSource.findFirst({
                where: {
                    episodeId: episode.id,
                    serverName: 'Kolektaku Stream 1',
                    audio: 'sub',
                },
            });

            if (episodeSource) {
                await prisma.episodeSource.update({
                    where: { id: episodeSource.id },
                    data: { urlSource: ep.url, externalId: ep.nineanimeEpId },
                });
            } else {
                await prisma.episodeSource.create({
                    data: {
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
            }

            saved++;
        } catch (error) {
            logger.warn(
                `[Phase1Worker] Failed to save episode ${ep.episodeNumber}: ${error.message}`,
            );
        }
    }
    return saved;
}

// ────────────────────────────────────────────
//  Search Preflight
// ────────────────────────────────────────────
async function runSearchPreflight({ getBrowser, proxyUrl, workerIndex }) {
    const keyword = process.env.SEED_HEALTHCHECK_KEYWORD || 'One Piece';
    const browser = await getBrowser(proxyUrl || null);
    const results = await searchAnime(browser, keyword, {
        maxPages: 1,
        earlyExitScore: StringSimilarityService.AUTO_MAP_THRESHOLD,
    });

    if (!Array.isArray(results) || results.length === 0) {
        throw new Error(
            `Preflight failed on worker ${workerIndex}: keyword "${keyword}" returned 0 results.`,
        );
    }
    return { keyword, count: results.length };
}

// ────────────────────────────────────────────
//  Process Single Koleksi (Open/Closed Principle)
// ────────────────────────────────────────────
async function processKoleksi({
    koleksi,
    workerIndex,
    workerProxies,
    selectedProxy,
    getBrowser,
    invalidateBrowser,
    session,
}) {
    let results = null;
    let lastProxyError = null;
    const proxyAttemptOrder = buildProxyAttemptOrder(
        workerProxies,
        selectedProxy,
    );

    // Attempt search across proxy pool
    for (const proxyAttempt of proxyAttemptOrder) {
        try {
            const browser = await getBrowser(proxyAttempt);
            const sourceMetadata = {
                altTitles: koleksi.altTitles || [],
                format: koleksi.format || null,
                totalEpisodes: koleksi.totalEpisodes || null,
                romaji: koleksi.romaji || null,
            };
            results = await searchAnime(browser, koleksi.title, {
                maxPages: MAX_SEARCH_PAGES,
                earlyExitScore: StringSimilarityService.AUTO_MAP_THRESHOLD,
                scoreFn: (items) => {
                    if (!Array.isArray(items) || items.length === 0) return 0;
                    return items.reduce((best, item) => {
                        const current =
                            StringSimilarityService.calculateSimilarity(
                                koleksi.title,
                                item,
                                sourceMetadata,
                            );
                        return current > best ? current : best;
                    }, 0);
                },
            });

            if (lastProxyError) {
                addWarning(session, {
                    koleksiId: koleksi.id,
                    reason: 'PROXY_FAILOVER_RECOVERED',
                    proxy: redactProxy(proxyAttempt),
                });
            }
            break;
        } catch (error) {
            if (!isRetryableProxyError(error)) throw error;
            lastProxyError = error;
            await invalidateBrowser(proxyAttempt);
            logger.warn(
                `[Phase1Worker] Proxy error on ${redactProxy(proxyAttempt)} for ${koleksi.id}: ${error.message}`,
            );
        }
    }

    if (!results && lastProxyError) {
        throw new Error(
            `All proxies failed for ${koleksi.id}: ${lastProxyError.message}`,
        );
    }

    // Score & evaluate
    const sourceMetadata = {
        altTitles: koleksi.altTitles || [],
        format: koleksi.format || null,
        totalEpisodes: koleksi.totalEpisodes || null,
        romaji: koleksi.romaji || null,
    };
    const scoredResults = StringSimilarityService.scoreAndSortResults(
        koleksi.title,
        results || [],
        sourceMetadata,
    );
    const best = scoredResults[0] || null;
    const action = StringSimilarityService.evaluateMatchAction(
        best,
        koleksi.status,
    );

    switch (action) {
        case 'NO_RESULT':
            await createPendingWithoutCandidate({
                koleksi,
                workerId: workerIndex,
                reason: 'NO_RESULT',
            });
            addWarningId(session, koleksi.id);
            addWarning(session, { koleksiId: koleksi.id, reason: 'NO_RESULT' });
            break;

        case 'AUTO_MAP':
            try {
                await saveNineanimeAutoMap(koleksi.id, best.nineanimeId);

                // Scrape episodes after successful auto-map
                if (koleksi.animeDetailId) {
                    try {
                        const proxyForEp =
                            workerProxies.length > 0 ? workerProxies[0] : null;
                        const browser = await getBrowser(proxyForEp);
                        const episodes = await getEpisodeList(
                            browser,
                            best.nineanimeId,
                        );
                        if (episodes.length > 0) {
                            const savedCount = await saveEpisodeBatch(
                                koleksi.animeDetailId,
                                episodes,
                            );
                            logger.info(
                                `[Phase1Worker] Saved ${savedCount}/${episodes.length} episodes for ${koleksi.title} (9anime ID: ${best.nineanimeId})`,
                            );
                        }
                    } catch (epError) {
                        logger.warn(
                            `[Phase1Worker] Episode scrape failed for ${koleksi.id}: ${epError.message}`,
                        );
                        addWarning(session, {
                            koleksiId: koleksi.id,
                            reason: 'EPISODE_SCRAPE_FAILED',
                            message: epError.message,
                        });
                    }
                }

                addSuccessId(session, koleksi.id);
            } catch (error) {
                if (isMALConflictError(error)) {
                    addWarningId(session, koleksi.id);
                    addWarning(session, {
                        koleksiId: koleksi.id,
                        reason: 'MAL_ID_CONFLICT',
                        message: error.message,
                    });
                } else {
                    throw error;
                }
            }
            break;

        case 'CANDIDATE':
        case 'CANDIDATE_FORCED':
            await createPendingWithCandidates({
                koleksi,
                workerId: workerIndex,
                reason:
                    action === 'CANDIDATE_FORCED'
                        ? 'NOT_YET_RELEASED_GUARD'
                        : 'SIMILARITY_REVIEW',
                scoredResults,
            });
            addWarningId(session, koleksi.id);
            addWarning(session, {
                koleksiId: koleksi.id,
                reason:
                    action === 'CANDIDATE_FORCED'
                        ? 'NOT_YET_RELEASED_GUARD'
                        : 'SIMILARITY_REVIEW',
                topScore: Number(best.score.toFixed(4)),
            });
            break;

        case 'LOW_CONFIDENCE':
        default:
            await createPendingWithoutCandidate({
                koleksi,
                workerId: workerIndex,
                reason: 'LOW_CONFIDENCE',
                bestScore: Number(best.score.toFixed(6)),
            });
            addWarningId(session, koleksi.id);
            addWarning(session, {
                koleksiId: koleksi.id,
                reason: 'LOW_CONFIDENCE',
                topScore: Number(best.score.toFixed(4)),
            });
            break;
    }
}

// ────────────────────────────────────────────
//  Main
// ────────────────────────────────────────────
async function main() {
    const workerTotal = parseInt(process.env.WORKER_TOTAL || '5', 10);
    const workerIndex = parseInt(process.env.NODE_APP_INSTANCE || '0', 10);
    const allPremiumProxies = ENABLE_PREMIUM_PROXY ? getPremiumProxies() : [];

    if (ENABLE_PREMIUM_PROXY && allPremiumProxies.length === 0) {
        throw new Error(
            'PREMIUM_PROXIES is empty. Provide env list or ensure frontend proxy source exists.',
        );
    }

    const workerProxies = ENABLE_PREMIUM_PROXY
        ? assignWorkerProxies(allPremiumProxies, workerIndex, 2)
        : [];
    const browserPool = new Map();
    const processedIds = [];

    const session = createScrapeSession({
        sourceName: SOURCE_NAME,
        workerId: workerIndex,
        context: {
            workerTotal,
            assignedProxies: workerProxies.map(redactProxy),
            networkMode: ENABLE_PREMIUM_PROXY ? 'premium-proxy' : 'direct-dns',
            isolationMode: 'phase1-seed-only',
            scheduleEnabled: false,
        },
    });

    const getBrowser = async (proxyUrl) => {
        const key = proxyUrl || '__direct__';
        if (!browserPool.has(key)) {
            browserPool.set(key, await launchBrowser({ proxyUrl }));
        }
        return browserPool.get(key);
    };

    const invalidateBrowser = async (proxyUrl) => {
        const key = proxyUrl || '__direct__';
        const browser = browserPool.get(key);
        if (!browser) return;
        browserPool.delete(key);
        await browser.close().catch(() => {});
    };

    const closeBrowsers = async () => {
        await Promise.allSettled(
            [...browserPool.values()].map((b) => b.close()),
        );
    };

    try {
        logger.info(
            `[Phase1Worker] Worker ${workerIndex}/${workerTotal} starting in ${ENABLE_PREMIUM_PROXY ? 'premium-proxy' : 'direct-dns'} mode (${workerProxies.length} proxy endpoint(s)).`,
        );

        // Preflight check
        if (!SKIP_SEARCH_PREFLIGHT) {
            const preflightProxy = workerProxies[0] || null;
            const preflight = await runSearchPreflight({
                getBrowser,
                proxyUrl: preflightProxy,
                workerIndex,
            });
            mergeSessionExtras(session, {
                preflight: {
                    keyword: preflight.keyword,
                    count: preflight.count,
                    proxy: preflightProxy
                        ? redactProxy(preflightProxy)
                        : 'direct',
                },
            });
            logger.info(
                `[Phase1Worker] Preflight OK: ${preflight.count} result(s) for "${preflight.keyword}".`,
            );
        }

        // Fetch owned chunk
        const ownedKoleksi = await fetchOwnedKoleksi(workerTotal, workerIndex);
        logger.info(
            `[Phase1Worker] Worker ${workerIndex} owns ${ownedKoleksi.length} anime row(s) for seeding.`,
        );

        // Process each item
        for (let i = 0; i < ownedKoleksi.length; i++) {
            const koleksi = ownedKoleksi[i];
            const selectedProxy =
                workerProxies.length > 0
                    ? workerProxies[i % workerProxies.length]
                    : null;
            processedIds.push(koleksi.id);

            try {
                await processKoleksi({
                    koleksi,
                    workerIndex,
                    workerProxies,
                    selectedProxy,
                    getBrowser,
                    invalidateBrowser,
                    session,
                });
            } catch (error) {
                addFailureId(session, koleksi.id, error.message);
                logger.error(
                    `[Phase1Worker] Failed processing ${koleksi.id}: ${error.message}`,
                );
            }

            // Throttle between items
            if (i < ownedKoleksi.length - 1) {
                await sleep(2000 + Math.floor(Math.random() * 3000));
            }
        }

        mergeSessionExtras(session, {
            processedIds,
            processedCount: processedIds.length,
        });
        await flushScrapeSession(session);
        logger.info(
            `[Phase1Worker] Worker ${workerIndex} finished. Processed=${processedIds.length}`,
        );
    } catch (error) {
        mergeSessionExtras(session, {
            processedIds,
            processedCount: processedIds.length,
        });
        await flushScrapeSession(session, { errorMessage: error.message });
        throw error;
    } finally {
        await closeBrowsers();
        await prisma.$disconnect();
    }
}

main().catch((error) => {
    logger.error(`[Phase1Worker] Fatal error: ${error.message}`);
    process.exit(1);
});
