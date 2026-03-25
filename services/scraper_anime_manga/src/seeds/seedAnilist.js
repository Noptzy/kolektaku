'use strict';

require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@kolektaku/database');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });
const { getWorkerIndex } = require('../utils/workerShard');
const {
    createScrapeSession,
    addSuccessId,
    addFailureId,
    addWarning,
    flushScrapeSession,
} = require('../services/ScrapeLogService');

const CONFIG = Object.freeze({
    ANILIST_API: 'https://graphql.anilist.co',
    MAX_PAGE: Math.min(
        parseInt(process.env.MAX_ANILIST_PAGE ?? '1107', 10),
        1200,
    ),
    PER_PAGE: Math.min(
        parseInt(process.env.PERPAGE_ANILIST_ITEMS ?? '20', 10),
        50,
    ),
    DELAY_MS: Math.max(750, parseInt(process.env.SEED_DELAY_MS ?? '1500', 10)),
    START_PAGE: parseInt(process.env.SEED_START_PAGE ?? '1', 10),
    MAX_EMPTY_PAGES: parseInt(process.env.SEED_MAX_EMPTY_PAGES ?? '5', 10),
    NSFW_GENRES: new Set(['Ecchi', 'Hentai']),
});

const buildQuery = (type) => `
  query AmbilDataAnimek($page: Int = 1, $perPage: Int = 20) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        currentPage
        hasNextPage
        lastPage
      }
      media(type: ${type}, sort: POPULARITY_DESC) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        synonyms
        isAdult
        status
        season
        seasonYear
        format
        episodes
        chapters
        volumes
        duration
        source
        genres
        description
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        coverImage {
          extraLarge
          color
        }
        bannerImage
        trailer {
          id
          site
          thumbnail
        }
        externalLinks {
          id
          site
          url
          type
          icon
          color
          language
        }
        nextAiringEpisode {
          episode
          airingAt
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
              }
              coverImage {
                large
              }
            }
          }
        }
        studios(sort: [FAVOURITES_DESC]) {
          edges {
            isMain
            node {
              id
              name
              isAnimationStudio
            }
          }
        }
        staff(sort: [RELEVANCE, ID], perPage: 15) {
          edges {
            role
            node {
              id
              name {
                full
              }
              image {
                large
              }
            }
          }
        }
        characters(sort: [ROLE, ID], perPage: 25) {
          edges {
            role
            node {
              id
              name {
                full
              }
              image {
                large
              }
            }
            voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
              id
              name {
                full
              }
              image {
                large
              }
            }
          }
        }
      }
    }
  }
`;

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function generateSlug(text) {
    if (!text) return `unknown-${Date.now()}`;
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 200);
}

const isNsfwCheck = (genres = []) =>
    genres.some((g) => CONFIG.NSFW_GENRES.has(g));

function buildAltTitles(title = {}, synonyms = []) {
    const candidates = [title.english, title.native, ...(synonyms ?? [])];
    return [...new Set(candidates.filter(Boolean))];
}

function buildTrailerUrl(trailer) {
    if (!trailer?.id) return null;
    if (trailer.site === 'youtube') {
        return `https://www.youtube.com/watch?v=${trailer.id}`;
    }
    if (trailer.site === 'dailymotion') {
        return `https://www.dailymotion.com/video/${trailer.id}`;
    }
    return null;
}

function unixToDate(unixSeconds) {
    return new Date(unixSeconds * 1000);
}

function fuzzyToDate(fuzzy) {
    if (!fuzzy?.year) return null;
    const month = fuzzy.month ?? 1;
    const day = fuzzy.day ?? 1;
    return new Date(Date.UTC(fuzzy.year, month - 1, day));
}

async function fetchAniListPage(query, variables, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const { data } = await axios.post(
                CONFIG.ANILIST_API,
                { query, variables },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    timeout: 30_000,
                },
            );

            if (data.errors?.length) {
                const errMsg = data.errors.map((e) => e.message).join('; ');
                throw new Error(`AniList GraphQL error(s): ${errMsg}`);
            }

            return data.data.Page;
        } catch (err) {
            const status = err.response?.status;
            const headers = err.response?.headers ?? {};

            if (status === 429) {
                let waitMs;

                const retryAfter = headers['retry-after'];
                if (retryAfter) {
                    waitMs = Math.ceil(parseFloat(retryAfter)) * 1000;
                } else {
                    const resetAt = headers['x-ratelimit-reset'];
                    if (resetAt) {
                        waitMs = Math.max(
                            0,
                            parseInt(resetAt, 10) * 1000 - Date.now(),
                        );
                    } else {
                        waitMs = 30_000;
                    }
                }

                waitMs += 1_000;

                const remaining = headers['x-ratelimit-remaining'] ?? '?';
                console.warn(
                    `  ⚠  429 Too Many Requests on attempt ${attempt}. ` +
                        `Remaining: ${remaining}. Waiting ${(waitMs / 1000).toFixed(1)}s…`,
                );

                await delay(waitMs);

                continue;
            }

            const isRetryable = !status || status >= 500;
            if (isRetryable && attempt < retries) {
                const backoff = CONFIG.DELAY_MS * attempt * 2;
                console.warn(
                    `  ⚠  Attempt ${attempt} failed (${status ?? 'network error'}). ` +
                        `Retrying in ${backoff}ms…`,
                );
                await delay(backoff);
            } else {
                throw err;
            }
        }
    }
}

function transformMedia(media, mediaType) {
    const isNsfw = media.isAdult === true || isNsfwCheck(media.genres ?? []);
    const publishStatus = isNsfw ? 'hidden' : 'published';
    const koleksiType = mediaType === 'ANIME' ? 'anime' : 'manga';
    const slug = generateSlug(media.title?.romaji);
    const altTitles = buildAltTitles(media.title, media.synonyms);
    const trailerUrl = buildTrailerUrl(media.trailer);

    const koleksiData = {
        title: media.title?.romaji ?? null,
        slug,
        posterUrl: media.coverImage?.extraLarge ?? null,
        landscapePosterUrl: media.bannerImage ?? null,
        altTitles,
        synopsis: media.description ?? null,
        type: media.format ?? null,
        status: media.status ?? null,
        releaseYear: media.seasonYear ?? null,
        koleksiType,
        publishStatus,
        isNsfw,
        contentRating: isNsfw ? 'R18+' : null,
        createdAt: new Date(),
    };

    const mappingData = {
        anilistId: media.id,
        myanimelistId: media.idMal ?? null,
        lastSyncAt: new Date(),
    };

    let detailData = null;

    if (mediaType === 'ANIME') {
        detailData = {
            format: media.format ?? null,
            totalEpisodes: media.episodes ?? null,
            epsDuration: media.duration ?? null,
            season: media.season
                ? `${media.season} ${media.seasonYear ?? ''}`.trim()
                : null,
            source: media.source ?? null,
            startDate: fuzzyToDate(media.startDate),
            endDate: fuzzyToDate(media.endDate),
            romaji: media.title?.romaji ?? null,
            externalLinks: media.externalLinks?.length
                ? media.externalLinks
                : undefined,
            trailerUrl,
        };
    } else {
        detailData = {
            chaptersCount: media.chapters ?? null,
            volumesCount: media.volumes ?? null,
        };
    }

    const genreData = (media.genres ?? []).map((name) => ({
        name,
        slug: generateSlug(name),
        isNsfw: CONFIG.NSFW_GENRES.has(name),
    }));

    const studioData = (media.studios?.edges ?? [])
        .filter((e) => e?.node?.id)
        .map((e) => ({
            anilistId: e.node.id,
            name: e.node.name ?? null,
            isAnimationStudio: e.node.isAnimationStudio ?? false,
            isMain: e.isMain ?? false,
        }));

    const characterData = (media.characters?.edges ?? [])
        .filter((e) => e?.node?.id)
        .map((e) => {
            const va = e.voiceActors?.[0] ?? null;
            return {
                anilistCharId: e.node.id,
                name: e.node.name?.full ?? null,
                imageUrl: e.node.image?.large ?? null,
                role: e.role ?? null,
                va: va
                    ? {
                          anilistId: va.id,
                          name: va.name?.full ?? null,
                          imageUrl: va.image?.large ?? null,
                      }
                    : null,
            };
        });

    const staffData = (media.staff?.edges ?? [])
        .filter((e) => e?.node?.id)
        .map((e) => ({
            anilistId: e.node.id,
            name: e.node.name?.full ?? null,
            imageUrl: e.node.image?.large ?? null,
            role: e.role ?? null,
        }));

    const relationData = (media.relations?.edges ?? [])
        .filter((e) => e?.node?.id)
        .map((e) => ({
            targetAnilistId: e.node.id,
            relationType: e.relationType ?? null,
        }));

    let airingData = null;
    if (media.nextAiringEpisode?.airingAt) {
        airingData = {
            episodeNumber: media.nextAiringEpisode.episode,
            airingAt: unixToDate(media.nextAiringEpisode.airingAt),
        };
    }

    return {
        slug,
        isNsfw,
        koleksiData,
        mappingData,
        detailData,
        genreData,
        studioData,
        characterData,
        staffData,
        relationData,
        airingData,
        mediaType,
    };
}

async function upsertMedia(transformed, options = {}) {
    const {
        slug,
        isNsfw,
        koleksiData,
        mappingData,
        detailData,
        studioData,
        characterData,
        staffData,
        relationData,
        airingData,
        mediaType,
        genreData,
    } = transformed;

    const metadataOnly = options.metadataOnly === true;
    const scrapeSession = options.scrapeSession || null;
    const sourceContext = options.sourceContext || 'seed_anilist';

    const safeMyAnimeListId = mappingData.myanimelistId;
    if (safeMyAnimeListId != null) {
        const malConflicts = await prisma.koleksiMapping.findMany({
            where: {
                myanimelistId: safeMyAnimeListId,
                NOT: {
                    anilistId: mappingData.anilistId,
                },
            },
            select: {
                anilistId: true,
                koleksiId: true,
                koleksi: { select: { title: true } },
            },
            take: 10,
        });

        if (malConflicts.length > 0) {
            const summary = malConflicts.map((item) => ({
                koleksiId: item.koleksiId,
                anilistId: item.anilistId,
                title: item.koleksi?.title || null,
            }));

            const warningMessage =
                `MAL collision for idMal=${safeMyAnimeListId} while processing anilist_id=${mappingData.anilistId}`;

            console.warn(`  ⚠  ${warningMessage}`);

            if (scrapeSession) {
                addWarning(scrapeSession, {
                    type: 'mal_collision',
                    message: warningMessage,
                    sourceContext,
                    myanimelistId: safeMyAnimeListId,
                    incomingAnilistId: mappingData.anilistId,
                    conflicts: summary,
                });
            }
        }
    }

    let existingKoleksi = await prisma.koleksi.findFirst({
        where: { mapping: { anilistId: mappingData.anilistId } },
        select: { id: true, slug: true },
    });

    if (!existingKoleksi) {
        const slugMatch = await prisma.koleksi.findUnique({
            where: { slug },
            include: { mapping: true },
        });

        if (slugMatch) {
                if (
                    !slugMatch.mapping?.anilistId ||
                    slugMatch.mapping.anilistId === mappingData.anilistId
                ) {
                    existingKoleksi = slugMatch;
                }
        }
    }

    let finalSlug = slug;
    const slugConflict = await prisma.koleksi.findFirst({
        where: {
            slug: finalSlug,
            NOT: existingKoleksi ? { id: existingKoleksi.id } : undefined,
            mapping: {
                NOT: { anilistId: mappingData.anilistId },
            },
        },
    });

    if (slugConflict) {
        finalSlug = `${slug}-${mappingData.anilistId}`;
    }

    const koleksiDataWithSlug = { ...koleksiData, slug: finalSlug };

    let koleksi;
    if (existingKoleksi) {
        koleksi = await prisma.koleksi.update({
            where: { id: existingKoleksi.id },
            data: {
                posterUrl: koleksiData.posterUrl,
                landscapePosterUrl: koleksiData.landscapePosterUrl,
                altTitles: koleksiData.altTitles,
                synopsis: koleksiData.synopsis,
                status: koleksiData.status,
                isNsfw: koleksiData.isNsfw,
                contentRating: koleksiData.contentRating,
                releaseYear: koleksiData.releaseYear,
                slug: finalSlug,

                mapping: {
                    upsert: {
                        create: {
                            anilistId: mappingData.anilistId,
                            myanimelistId: safeMyAnimeListId,
                            lastSyncAt: mappingData.lastSyncAt,
                        },
                        update: {
                            anilistId: mappingData.anilistId,
                            myanimelistId: safeMyAnimeListId,
                            lastSyncAt: mappingData.lastSyncAt,
                        },
                    },
                },

                ...(mediaType === 'ANIME' && detailData
                    ? {
                          animeDetail: {
                              upsert: {
                                  create: detailData,
                                  update: {
                                      format: detailData.format,
                                      totalEpisodes: detailData.totalEpisodes,
                                      epsDuration: detailData.epsDuration,
                                      season: detailData.season,
                                      source: detailData.source,
                                      startDate: detailData.startDate,
                                      endDate: detailData.endDate,
                                      externalLinks: detailData.externalLinks,
                                      trailerUrl: detailData.trailerUrl,
                                  },
                              },
                          },
                      }
                    : {}),
                ...(mediaType === 'MANGA' && detailData
                    ? {
                          mangaDetail: {
                              upsert: {
                                  create: detailData,
                                  update: {
                                      chaptersCount: detailData.chaptersCount,
                                      volumesCount: detailData.volumesCount,
                                  },
                              },
                          },
                      }
                    : {}),
            },
            select: { id: true },
        });
    } else {
        koleksi = await prisma.koleksi.create({
            data: {
                ...koleksiDataWithSlug,
                mapping: {
                    create: {
                        anilistId: mappingData.anilistId,
                        myanimelistId: safeMyAnimeListId,
                        lastSyncAt: mappingData.lastSyncAt,
                    },
                },
                ...(mediaType === 'ANIME' && detailData
                    ? { animeDetail: { create: detailData } }
                    : {}),
                ...(mediaType === 'MANGA' && detailData
                    ? { mangaDetail: { create: detailData } }
                    : {}),
                ...(isNsfw
                    ? {
                          pendingMappings: {
                              create: {
                                  sourceName: 'anilist',
                                  sourceIdOrSlug: String(mappingData.anilistId),
                                  scrapedTitle: koleksiData.title,
                                  status: 'pending',
                                  createdAt: new Date(),
                              },
                          },
                      }
                    : {}),
            },
            select: { id: true },
        });
    }

    const koleksiId = koleksi.id;

    if (metadataOnly) {
        return koleksiId;
    }

    for (const genre of genreData) {
        const genreRow = await prisma.genre.upsert({
            where: { slug: genre.slug },
            create: {
                name: genre.name,
                slug: genre.slug,
                isNsfw: genre.isNsfw,
            },
            update: { isNsfw: genre.isNsfw },
            select: { id: true },
        });

        await prisma.koleksiGenre.upsert({
            where: { koleksiId_genreId: { koleksiId, genreId: genreRow.id } },
            create: { koleksiId, genreId: genreRow.id },
            update: {},
        });
    }

    for (const studio of studioData) {
        const studioRow = await prisma.studio.upsert({
            where: { anilistId: studio.anilistId },
            create: {
                anilistId: studio.anilistId,
                name: studio.name,
                isAnimationStudio: studio.isAnimationStudio,
            },
            update: {
                name: studio.name,
                isAnimationStudio: studio.isAnimationStudio,
            },
            select: { id: true },
        });

        await prisma.koleksiStudio.upsert({
            where: {
                koleksiId_studioId: { koleksiId, studioId: studioRow.id },
            },
            create: {
                koleksiId,
                studioId: studioRow.id,
                isMain: studio.isMain,
            },
            update: { isMain: studio.isMain },
        });
    }

    for (const member of staffData) {
        const staffRow = await prisma.staff.upsert({
            where: { anilistId: member.anilistId },
            create: {
                anilistId: member.anilistId,
                name: member.name,
                imageUrl: member.imageUrl,
            },
            update: {
                name: member.name,
                imageUrl: member.imageUrl,
            },
            select: { id: true },
        });

        await prisma.koleksiStaff.upsert({
            where: { koleksiId_staffId: { koleksiId, staffId: staffRow.id } },
            create: { koleksiId, staffId: staffRow.id, role: member.role },
            update: { role: member.role },
        });
    }

    for (const char of characterData) {
        let charRow = await prisma.character.findFirst({
            where: {
                name: char.name,
                imageUrl: char.imageUrl,
            },
            select: { id: true },
        });

        if (!charRow) {
            charRow = await prisma.character.create({
                data: {
                    name: char.name,
                    imageUrl: char.imageUrl,
                },
                select: { id: true },
            });
        }

        let vaRow = null;
        if (char.va) {
            vaRow = await prisma.voiceActor.upsert({
                where: { anilistId: char.va.anilistId },
                create: {
                    anilistId: char.va.anilistId,
                    name: char.va.name,
                    imageUrl: char.va.imageUrl,
                },
                update: {
                    name: char.va.name,
                    imageUrl: char.va.imageUrl,
                },
                select: { id: true },
            });
        }

        await prisma.koleksiCharacter.upsert({
            where: {
                koleksiId_characterId: {
                    koleksiId,
                    characterId: charRow.id,
                },
            },
            create: {
                koleksiId,
                characterId: charRow.id,
                vaId: vaRow?.id ?? null,
                role: char.role,
            },
            update: {
                vaId: vaRow?.id ?? null,
                role: char.role,
            },
        });
    }

    for (const rel of relationData) {
        const existingRel = await prisma.koleksiRelation.findFirst({
            where: {
                sourceKoleksiId: koleksiId,
                targetAnilistId: rel.targetAnilistId,
            },
            select: { id: true },
        });

        if (!existingRel) {
            await prisma.koleksiRelation.create({
                data: {
                    sourceKoleksiId: koleksiId,
                    targetAnilistId: rel.targetAnilistId,
                    relationType: rel.relationType,
                },
            });
        }
    }

    if (airingData) {
        const existingSchedule = await prisma.airingSchedule.findFirst({
            where: {
                koleksiId,
                episodeNumber: airingData.episodeNumber,
            },
            select: { id: true },
        });

        if (!existingSchedule) {
            await prisma.airingSchedule.create({
                data: {
                    koleksiId,
                    episodeNumber: airingData.episodeNumber,
                    airingAt: airingData.airingAt,
                    createdAt: new Date(),
                },
            });
        } else {
            await prisma.airingSchedule.update({
                where: { id: existingSchedule.id },
                data: { airingAt: airingData.airingAt, updatedAt: new Date() },
            });
        }
    }

    return koleksiId;
}

let totalInserted = 0;
let totalErrors = 0;

function logProgress(page, lastPage, success, failed) {
    const pct = lastPage > 0 ? ((page / lastPage) * 100).toFixed(1) : '?';
    console.log(
        `  ✅ Page ${page}/${lastPage ?? '?'} (${pct}%) — ` +
            `+${success} ok, ✗${failed} err — cumulative: ${totalInserted} ok / ${totalErrors} err`,
    );
}

async function seedMediaType(mediaType, options = {}) {
    const scrapeSession = options.scrapeSession || null;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  🚀  Starting ${mediaType} seed`);
    console.log(
        `  ⚙   Config: startPage=${CONFIG.START_PAGE}, maxPage=${CONFIG.MAX_PAGE}, perPage=${CONFIG.PER_PAGE}, delay=${CONFIG.DELAY_MS}ms, maxEmptyPages=${CONFIG.MAX_EMPTY_PAGES}`,
    );
    console.log(`${'═'.repeat(60)}\n`);

    const query = buildQuery(mediaType);
    let currentPage = CONFIG.START_PAGE;
    let lastPage = null;
    let hasNextPage = true;

    let emptyPageStreak = 0;

    while (currentPage <= CONFIG.MAX_PAGE) {
        let pageSuccessCount = 0;
        let pageErrorCount = 0;

        let pageData;
        try {
            pageData = await fetchAniListPage(query, {
                page: currentPage,
                perPage: CONFIG.PER_PAGE,
            });
        } catch (fetchErr) {
            const status = fetchErr.response?.status;
            const isEmptyLike = status === 404 || status === 410;

            if (isEmptyLike) {
                emptyPageStreak++;
                console.warn(
                    `  ⚠  Page ${currentPage} returned ${status} ` +
                        `(empty streak: ${emptyPageStreak}/${CONFIG.MAX_EMPTY_PAGES})`,
                );
                if (emptyPageStreak >= CONFIG.MAX_EMPTY_PAGES) {
                    console.log(
                        `  🏁  ${CONFIG.MAX_EMPTY_PAGES} consecutive empty pages — treating as end of data.`,
                    );
                    break;
                }
                currentPage++;
                await delay(CONFIG.DELAY_MS);
                continue;
            }

            console.error(
                `\n  ❌ Fatal fetch failure on page ${currentPage}: ${fetchErr.message}`,
            );
            break;
        }

        const { pageInfo, media: mediaList } = pageData;
        hasNextPage = pageInfo.hasNextPage;
        lastPage = pageInfo.lastPage;

        if (!mediaList?.length) {
            emptyPageStreak++;
            console.warn(
                `  ⚠  Page ${currentPage} returned 0 items ` +
                    `(empty streak: ${emptyPageStreak}/${CONFIG.MAX_EMPTY_PAGES})`,
            );
            if (emptyPageStreak >= CONFIG.MAX_EMPTY_PAGES) {
                console.log(
                    `  🏁  ${CONFIG.MAX_EMPTY_PAGES} consecutive empty pages — treating as end of data.`,
                );
                break;
            }
            logProgress(currentPage, lastPage, 0, 0);
            currentPage++;
            await delay(CONFIG.DELAY_MS);
            continue;
        }

        emptyPageStreak = 0;

        for (const media of mediaList) {
            try {
                const transformed = transformMedia(media, mediaType);
                await upsertMedia(transformed, options);
                pageSuccessCount++;
                totalInserted++;
                if (scrapeSession) {
                    addSuccessId(scrapeSession, media?.id);
                }
            } catch (itemErr) {
                pageErrorCount++;
                totalErrors++;
                if (scrapeSession) {
                    addFailureId(scrapeSession, media?.id || 'unknown', itemErr.message);
                }
                console.error(
                    `  ✗  Error on anilist_id=${media?.id} ` +
                        `"${media?.title?.romaji ?? 'unknown'}": ${itemErr.message}`,
                );
            }
        }

        logProgress(currentPage, lastPage, pageSuccessCount, pageErrorCount);
        currentPage++;

        if (hasNextPage && currentPage <= CONFIG.MAX_PAGE) {
            await delay(CONFIG.DELAY_MS);
        }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  🏁  ${mediaType} seed finished.`);
    console.log(`      Total inserted/updated : ${totalInserted}`);
    console.log(`      Total errors           : ${totalErrors}`);
    console.log(`${'═'.repeat(60)}\n`);
}

async function main() {
    totalInserted = 0;
    totalErrors = 0;

    const args = process.argv.slice(2).map((arg) => String(arg).toLowerCase());
    const arg = args.find((item) => ['anime', 'manga', 'all'].includes(item));

    const metadataOnly =
        args.includes('--metadata-only') ||
        String(process.env.SEED_MODE || '').toLowerCase() === 'metadata';

    const masterOnly =
        args.includes('--master-only') ||
        String(process.env.MASTER_ONLY || '').toLowerCase() === '1';

    const workerId = getWorkerIndex(process.env.NODE_APP_INSTANCE);

    if (masterOnly && workerId !== 0) {
        console.log(
            `[seedAnilist] Skipping on worker ${workerId}. Master-only seeder runs only on worker 0.`,
        );
        await prisma.$disconnect();
        await pool.end();
        return;
    }

    const runAnime = !arg || arg === 'anime' || arg === 'all';
    const runManga = arg === 'manga' || arg === 'all';

    if (!runAnime && !runManga) {
        console.error(
            'Unknown argument. Use: anime | manga | all (default: anime)',
        );
        process.exit(1);
    }

    const scrapeSession = createScrapeSession({
        sourceName: metadataOnly ? 'anilist_master_seed' : 'anilist_seed',
        workerId,
        context: {
            mode: metadataOnly ? 'metadata-only' : 'full',
            runAnime,
            runManga,
            arg: arg || 'anime',
        },
    });

    let mainError = null;

    try {
        if (runAnime) await seedMediaType('ANIME', { metadataOnly, scrapeSession });
        if (runManga) await seedMediaType('MANGA', { metadataOnly, scrapeSession });
    } catch (error) {
        mainError = error;
        throw error;
    } finally {
        try {
            await flushScrapeSession(scrapeSession, {
                errorMessage: mainError ? mainError.message : null,
            });
        } catch (logError) {
            console.error('[seedAnilist] Failed writing scrape log:', logError.message);
        }

        await prisma.$disconnect();
        await pool.end();
    }
}

if (require.main === module) {
    main().catch(async (err) => {
        console.error('Unhandled error:', err);
        await prisma.$disconnect().catch(() => {});
        await pool.end().catch(() => {});
        process.exit(1);
    });
}

module.exports = {
    CONFIG,
    buildQuery,
    fetchAniListPage,
    transformMedia,
    upsertMedia,
    prisma,
};
