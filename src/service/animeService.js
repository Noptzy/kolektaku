const animeRepository = require('../repository/animeRepository');
const streamResolverClient = require('./streamResolverClient');
const redis = require('../config/redisUpstash');

class AnimeService {
    /**
     * Helper to format pagination response
     */
    _formatPagination(data, total, page, limit) {
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            total,
            page,
            limit,
            totalPages,
        };
    }

    async getAllAnime(page = 1, limit = 20, filters = {}) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            animeRepository.findAll({ skip, take: limit, filters }),
            animeRepository.countAll(filters),
        ]);

        return this._formatPagination(data, total, page, limit);
    }

    async getFilterOptions() {
        const [types, statuses, contentRatings, years, genres] = await Promise.all([
            animeRepository.getDistinct('type'),
            animeRepository.getDistinct('status'),
            animeRepository.getDistinct('contentRating'),
            animeRepository.getDistinctYears(),
            animeRepository.getGenres(),
        ]);
        return { types, statuses, contentRatings, years, genres };
    }

    async getAnimeBySlug(slug) {
        const anime = await animeRepository.findBySlug(slug);
        if (!anime) return null;

        // Fetch target anime details for relations
        if (anime.relations && anime.relations.length > 0) {
            const anilistIds = [...new Set(anime.relations.map((r) => r.targetAnilistId).filter(Boolean))];
            if (anilistIds.length > 0) {
                const targetAnimes = await animeRepository.findByAnilistIds(anilistIds);
                
                const anilistMap = new Map();
                targetAnimes.forEach((ta) => {
                    if (ta.mapping && ta.mapping.anilistId) {
                        anilistMap.set(ta.mapping.anilistId, {
                            title: ta.title,
                            slug: ta.slug,
                            type: ta.type,
                            posterUrl: ta.posterUrl,
                        });
                    }
                });

                anime.relations = anime.relations
                    .map((r) => ({
                        ...r,
                        targetAnime: anilistMap.get(r.targetAnilistId) || null,
                    }))
                    .filter((r) => r.targetAnime !== null);
            }
        }

        return anime;
    }

    async getEpisodeList(slug) {
        return animeRepository.findEpisodesBySlug(slug);
    }

    async getEpisodeStream(slug, episodeNumber) {
        const episode = await animeRepository.findEpisodeBySlugAndNumber(slug, episodeNumber);
        if (!episode) return null;

        // Check Redis cache first
        const cacheKey = `stream:${slug}:ep:${episodeNumber}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
            return {
                episode: {
                    id: episode.id,
                    title: episode.title,
                    episodeNumber: episode.episodeNumber,
                },
                stream: cached,
                cached: true,
            };
        }

        // Find an HLS source to resolve
        const hlsSource = episode.sources.find((s) => s.streamType === 'hls');

        let streamData = null;
        if (hlsSource && hlsSource.urlSource) {
            try {
                streamData = await streamResolverClient.resolve(hlsSource.urlSource);

                // Cache successful stream data for 1 hour (3600 seconds)
                if (streamData && !streamData.error) {
                    await redis.set(cacheKey, JSON.stringify(streamData), { ex: 3600 });
                }
            } catch (error) {
                // If stream resolution fails, still return the episode info
                streamData = { error: 'Stream resolution failed', message: error.message };
            }
        }

        return {
            episode: {
                id: episode.id,
                title: episode.title,
                episodeNumber: episode.episodeNumber,
            },
            stream: streamData,
            cached: false,
        };
    }

    async searchAnime(keyword, page = 1, limit = 20, filters = {}) {
        if (!keyword) {
            return this._formatPagination([], 0, page, limit);
        }

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            animeRepository.searchFuzzy(keyword, { skip, take: limit, filters }),
            animeRepository.countSearchFuzzy(keyword, filters),
        ]);

        return this._formatPagination(data, total, page, limit);
    }

    async getStaffAnime(staffId, page = 1, limit = 20, sort = 'newest') {
        const skip = (page - 1) * limit;

        const [relations, total] = await Promise.all([
            animeRepository.findByStaff(staffId, { skip, take: limit, sort }),
            animeRepository.countByStaff(staffId),
        ]);

        const staffInfo = relations.length > 0 ? relations[0].staff : null;
        const animeList = relations.map((r) => r.koleksi);

        const result = this._formatPagination(animeList, total, page, limit);

        // Keep the same pagination shape that resHandler expects: { data, total, page, limit, totalPages }
        // BUT modify the inner data object
        result.data = {
            staff: staffInfo,
            relations: animeList,
        };

        return result;
    }

    async getStudioAnime(studioId, page = 1, limit = 20, sort = 'newest') {
        const skip = (page - 1) * limit;

        const [relations, total] = await Promise.all([
            animeRepository.findByStudio(studioId, { skip, take: limit, sort }),
            animeRepository.countByStudio(studioId),
        ]);

        const studioInfo = relations.length > 0 ? relations[0].studio : null;
        const animeList = relations.map((r) => r.koleksi);

        const result = this._formatPagination(animeList, total, page, limit);

        result.data = {
            studio: studioInfo,
            relations: animeList,
        };

        return result;
    }
    async getVAanime(vaId, page = 1, limit = 20, sort = 'newest') {
        const skip = (page - 1) * limit;

        const [relations, total] = await Promise.all([
            animeRepository.findByVoiceActor(vaId, { skip, take: limit, sort }),
            animeRepository.countByVoiceActor(vaId),
        ]);

        const voiceActorInfo = relations.length > 0 ? relations[0].voiceActor : null;

        const animeList = relations.map((r) => ({
            ...r.koleksi,
            voiceActorCharacter: r.character,
        }));

        const result = this._formatPagination(animeList, total, page, limit);

        result.data = {
            voiceActor: voiceActorInfo,
            relations: animeList,
        };

        return result;
    }

    async getCharacterAnime(characterId, page = 1, limit = 20, sort = 'newest') {
        const skip = (page - 1) * limit;

        const [relations, total] = await Promise.all([
            animeRepository.findByCharacter(characterId, { skip, take: limit, sort }),
            animeRepository.countByCharacter(characterId),
        ]);

        const characterInfo = relations.length > 0 ? relations[0].character : null;

        const animeList = relations.map((r) => ({
            ...r.koleksi,
            voiceActor: r.voiceActor,
        }));

        const result = this._formatPagination(animeList, total, page, limit);

        result.data = {
            character: characterInfo,
            relations: animeList,
        };

        return result;
    }

    async getAnimeByGenre(genre, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            animeRepository.findByGenre(genre, { skip, take: limit }),
            animeRepository.countByGenre(genre),
        ]);

        return this._formatPagination(data, total, page, limit);
    }

    async getGlobalStats() {
        return animeRepository.getGlobalStats();
    }
}

module.exports = new AnimeService();
