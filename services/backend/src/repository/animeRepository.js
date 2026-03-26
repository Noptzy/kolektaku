const prisma = require('../config/prisma');

class AnimeRepository {
    _buildFilterWhere(filters = {}) {
        const where = {
            koleksiType: 'anime',
            publishStatus: 'published',
            animeDetail: { episodes: { some: {} } },
        };

        if (filters.type) {
            where.OR = [
                { type: { equals: filters.type, mode: 'insensitive' } },
                { animeDetail: { format: { equals: filters.type, mode: 'insensitive' } } }
            ];
        }
        if (filters.status) where.status = { equals: filters.status, mode: 'insensitive' };
        if (filters.contentRating) where.contentRating = { equals: filters.contentRating, mode: 'insensitive' };

        if (filters.year) {
            where.releaseYear = parseInt(filters.year);
        } else {
            if (filters.yearFrom) where.releaseYear = { ...where.releaseYear, gte: parseInt(filters.yearFrom) };
            if (filters.yearTo) where.releaseYear = { ...where.releaseYear, lte: parseInt(filters.yearTo) };
        }

        if (filters.genre) {
            where.genres = { some: { genre: { name: { equals: filters.genre, mode: 'insensitive' } } } };
        }

        if (filters.q) {
            const qFilter = [
                { title: { contains: filters.q, mode: 'insensitive' } },
                { slug: { contains: filters.q, mode: 'insensitive' } },
            ];
            if (where.OR) {
                where.AND = [
                    { OR: where.OR },
                    { OR: qFilter }
                ];
                delete where.OR;
            } else {
                where.OR = qFilter;
            }
        }

        return where;
    }

    /**
     * Admin filter — does NOT require episodes, shows all publishStatuses.
     * Accepts: hasEpisodes, publishStatus, type, status, year, genre, search
     */
    _buildAdminFilterWhere(filters = {}) {
        const where = { koleksiType: 'anime' };

        if (filters.publishStatus) where.publishStatus = filters.publishStatus;
        if (filters.hasEpisodes === 'true' || filters.hasEpisodes === true) {
            where.animeDetail = { episodes: { some: {} } };
        } else if (filters.hasEpisodes === 'false' || filters.hasEpisodes === false) {
            where.NOT = { animeDetail: { episodes: { some: {} } } };
        }

        if (filters.type) {
            where.OR = [
                { type: { equals: filters.type, mode: 'insensitive' } },
                { animeDetail: { format: { equals: filters.type, mode: 'insensitive' } } }
            ];
        }
        if (filters.status) where.status = { equals: filters.status, mode: 'insensitive' };
        if (filters.year) where.releaseYear = parseInt(filters.year);
        if (filters.genre) {
            where.genres = { some: { genre: { name: { equals: filters.genre, mode: 'insensitive' } } } };
        }

        if (filters.search) {
            const searchFilter = [
                { title: { contains: filters.search, mode: 'insensitive' } },
                { slug: { contains: filters.search, mode: 'insensitive' } },
            ];
            if (where.OR) {
                where.AND = [
                    { OR: where.OR },
                    { OR: searchFilter }
                ];
                delete where.OR;
            } else {
                where.OR = searchFilter;
            }
        }

        if (filters.mappedStatus === 'mapped') {
            where.mapping = { anilistId: { not: null } };
        } else if (filters.mappedStatus === 'unmapped') {
            where.mapping = null;
        }

        return where;
    }

    _buildOrderBy(sort) {
        switch (sort) {
            case 'oldest': return { createdAt: 'asc' };
            case 'title_asc': return { title: 'asc' };
            case 'title_desc': return { title: 'desc' };
            case 'year_asc': return { releaseYear: 'asc' };
            case 'year_desc': return { releaseYear: 'desc' };
            case 'newest':
            default: return { createdAt: 'desc' };
        }
    }

    async findAll({ skip = 0, take = 20, filters = {} } = {}, tx = prisma) {
        return tx.koleksi.findMany({
            skip,
            take,
            where: this._buildFilterWhere(filters),
            orderBy: this._buildOrderBy(filters.sort),
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                landscapePosterUrl: true,
                synopsis: true,
                releaseYear: true,
                status: true,
                type: true,
                contentRating: true,
                animeDetail: { select: { totalEpisodes: true } },
                mapping: {
                    select: {
                        anilistId: true,
                        myanimelistId: true,
                    },
                },
            },
        });
    }

    async countAll(filters = {}, tx = prisma) {
        return tx.koleksi.count({
            where: this._buildFilterWhere(filters),
        });
    }

    async findRandom(limit = 10, tx = prisma) {
        const count = await this.countAll({}, tx);
        const skip = Math.max(0, Math.floor(Math.random() * (count - limit)));
        
        return tx.koleksi.findMany({
            skip,
            take: limit,
            where: this._buildFilterWhere({}),
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                landscapePosterUrl: true,
                synopsis: true,
                releaseYear: true,
                status: true,
                type: true,
                animeDetail: { select: { totalEpisodes: true } },
            },
        });
    }

    async findBySlug(slug, tx = prisma) {
        return tx.koleksi.findUnique({
            where: {
                slug,
            },
            include: {
                animeDetail: true,
                genres: {
                    include: {
                        genre: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                    },
                },
                studios: {
                    include: {
                        studio: {
                            select: {
                                id: true,
                                name: true,
                                isAnimationStudio: true,
                            },
                        },
                    },
                },
                staff: {
                    include: {
                        staff: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
                characters: {
                    include: {
                        character: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                        voiceActor: {
                            select: {
                                id: true,
                                name: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
                relations: true,
                mapping: {
                    select: {
                        koleksiId: true,
                        anilistId: true,
                        myanimelistId: true,
                        nineanimeId: true,
                        komikindoSlug: true,
                        lastSyncAt: true,
                    }
                },
            },
        });
    }

    async findByAnilistId(anilistId, tx = prisma) {
        return tx.koleksi.findFirst({
            where: {
                mapping: { anilistId }
            },
            include: {
                mapping: true
            }
        });
    }

    async findByAnilistIds(anilistIds, tx = prisma) {
        return tx.koleksi.findMany({
            where: {
                mapping: {
                    anilistId: {
                        in: anilistIds,
                    },
                },
            },
            select: {
                title: true,
                slug: true,
                type: true,
                posterUrl: true,
                landscapePosterUrl: true,
                mapping: {
                    select: {
                        anilistId: true,
                    },
                },
            },
        });
    }

    async findEpisodesBySlug(slug, tx = prisma) {
        const koleksi = await tx.koleksi.findUnique({
            where: { slug },
            select: {
                animeDetail: {
                    select: { id: true },
                },
            },
        });

        if (!koleksi?.animeDetail) return null;

        return tx.episode.findMany({
            where: { animeId: koleksi.animeDetail.id },
            orderBy: { episodeNumber: 'desc' },
            select: {
                title: true,
                episodeNumber: true,
            },
        });
    }

    async findEpisodeBySlugAndNumber(slug, episodeNumber, tx = prisma) {
        const koleksi = await tx.koleksi.findUnique({
            where: { slug },
            select: {
                animeDetail: {
                    select: { id: true },
                },
            },
        });

        if (!koleksi?.animeDetail) return null;

        return tx.episode.findFirst({
            where: {
                animeId: koleksi.animeDetail.id,
                episodeNumber: episodeNumber,
            },
            select: {
                id: true,
                title: true,
                episodeNumber: true,
                sources: {
                    select: {
                        id: true,
                        serverName: true,
                        urlSource: true,
                        streamType: true,
                    },
                },
            },
        });
    }

    async searchFuzzy(keyword, { skip = 0, take = 20, filters = {} } = {}, tx = prisma) {
        const where = this._buildFilterWhere(filters);
        
        where.AND = [
            {
                OR: [
                    { title: { contains: keyword, mode: 'insensitive' } },
                    { slug: { contains: keyword, mode: 'insensitive' } },
                    { genres: { some: { genre: { name: { contains: keyword, mode: 'insensitive' } } } } },
                    {
                        studios: {
                            some: { studio: { name: { contains: keyword, mode: 'insensitive' } } },
                        },
                    },
                    {
                        staff: {
                            some: { staff: { name: { contains: keyword, mode: 'insensitive' } } },
                        },
                    },
                    {
                        characters: {
                            some: {
                                OR: [
                                    { character: { name: { contains: keyword, mode: 'insensitive' } } },
                                    { voiceActor: { name: { contains: keyword, mode: 'insensitive' } } },
                                ],
                            },
                        },
                    },
                ],
            }
        ];

        // First try Prisma search
        let results = await tx.koleksi.findMany({
            skip,
            take,
            where,
            orderBy: this._buildOrderBy(filters.sort),
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                landscapePosterUrl: true,
                releaseYear: true,
                status: true,
                type: true,
                animeDetail: { select: { totalEpisodes: true } },
            },
        });

        // If no results from title, try alt_titles via raw SQL
        if (results.length === 0 && keyword.length >= 2) {
            const altResults = await tx.$queryRaw`
                SELECT k.id, k.title, k.slug, k.poster_url as "posterUrl", 
                       k.landscape_poster_url as "landscapePosterUrl",
                       k.release_year as "releaseYear", k.status, k.type
                FROM koleksi k
                WHERE k.koleksi_type = 'anime'
                  AND k.publish_status = 'published'
                  AND EXISTS (SELECT 1 FROM anime_detail ad JOIN episodes e ON e.anime_id = ad.id WHERE ad.koleksi_id = k.id)
                  AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(k.alt_titles) AS alt
                    WHERE alt ILIKE ${'%' + keyword + '%'}
                  )
                ORDER BY k.created_at DESC
                LIMIT ${take} OFFSET ${skip}
            `;
            results = altResults;
        }

        return results;
    }

    async countSearchFuzzy(keyword, filters = {}, tx = prisma) {
        const where = this._buildFilterWhere(filters);
        
        where.AND = [
            {
                OR: [
                    { title: { contains: keyword, mode: 'insensitive' } },
                    { slug: { contains: keyword, mode: 'insensitive' } },
                    { genres: { some: { genre: { name: { contains: keyword, mode: 'insensitive' } } } } },
                    {
                        studios: {
                            some: { studio: { name: { contains: keyword, mode: 'insensitive' } } },
                        },
                    },
                    {
                        staff: {
                            some: { staff: { name: { contains: keyword, mode: 'insensitive' } } },
                        },
                    },
                    {
                        characters: {
                            some: {
                                OR: [
                                    { character: { name: { contains: keyword, mode: 'insensitive' } } },
                                    { voiceActor: { name: { contains: keyword, mode: 'insensitive' } } },
                                ],
                            },
                        },
                    },
                ],
            }
        ];

        const count = await tx.koleksi.count({ where });

        // If no results from title, try alt_titles
        if (count === 0 && keyword.length >= 2) {
            const altCount = await tx.$queryRaw`
                SELECT COUNT(*)::int as count
                FROM koleksi k
                WHERE k.koleksi_type = 'anime'
                  AND k.publish_status = 'published'
                  AND EXISTS (SELECT 1 FROM anime_detail ad JOIN episodes e ON e.anime_id = ad.id WHERE ad.koleksi_id = k.id)
                  AND EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(k.alt_titles) AS alt
                    WHERE alt ILIKE ${'%' + keyword + '%'}
                  )
            `;
            return altCount[0]?.count || 0;
        }

        return count;
    }

    async findByStaff(staffId, { skip = 0, take = 20, sort = 'newest' } = {}, tx = prisma) {
        return tx.koleksiStaff.findMany({
            skip,
            take,
            where: {
                staffId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
            orderBy: {
                koleksi: this._buildOrderBy(sort)
            },
            include: {
                staff: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        posterUrl: true,
                        landscapePosterUrl: true,
                        releaseYear: true,
                        status: true,
                        type: true,
                        animeDetail: { select: { totalEpisodes: true } },
                    },
                },
            },
        });
    }

    async countByStaff(staffId, tx = prisma) {
        return tx.koleksiStaff.count({
            where: {
                staffId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
        });
    }

    async findByStudio(studioId, { skip = 0, take = 20, sort = 'newest' } = {}, tx = prisma) {
        return tx.koleksiStudio.findMany({
            skip,
            take,
            where: {
                studioId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
            orderBy: {
                koleksi: this._buildOrderBy(sort)
            },
            include: {
                studio: {
                    select: {
                        id: true,
                        name: true,
                        isAnimationStudio: true,
                    },
                },
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        posterUrl: true,
                        landscapePosterUrl: true,
                        releaseYear: true,
                        status: true,
                        type: true,
                        animeDetail: { select: { totalEpisodes: true } },
                    },
                },
            },
        });
    }

    async countByStudio(studioId, tx = prisma) {
        return tx.koleksiStudio.count({
            where: {
                studioId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
        });
    }

    async findByVoiceActor(vaId, { skip = 0, take = 20, sort = 'newest' } = {}, tx = prisma) {
        return tx.koleksiCharacter.findMany({
            skip,
            take,
            where: {
                vaId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
            orderBy: {
                koleksi: this._buildOrderBy(sort)
            },
            include: {
                voiceActor: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
                character: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        posterUrl: true,
                        landscapePosterUrl: true,
                        releaseYear: true,
                        status: true,
                        type: true,
                        animeDetail: { select: { totalEpisodes: true } },
                    },
                },
            },
        });
    }

    async countByVoiceActor(vaId, tx = prisma) {
        return tx.koleksiCharacter.count({
            where: {
                vaId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
        });
    }

    async findByCharacter(characterId, { skip = 0, take = 20, sort = 'newest' } = {}, tx = prisma) {
        return tx.koleksiCharacter.findMany({
            skip,
            take,
            where: {
                characterId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
            orderBy: {
                koleksi: this._buildOrderBy(sort)
            },
            include: {
                character: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
                voiceActor: {
                    select: {
                        id: true,
                        name: true,
                        imageUrl: true,
                    },
                },
                koleksi: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        posterUrl: true,
                        landscapePosterUrl: true,
                        releaseYear: true,
                        status: true,
                        type: true,
                        animeDetail: { select: { totalEpisodes: true } },
                    },
                },
            },
        });
    }

    async countByCharacter(characterId, tx = prisma) {
        return tx.koleksiCharacter.count({
            where: {
                characterId,
                koleksi: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } },
                },
            },
        });
    }

    async findByGenre(genre, { skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.koleksi.findMany({
            skip,
            take,
            where: {
                koleksiType: 'anime',
                publishStatus: 'published',
                animeDetail: { episodes: { some: {} } },
                genres: {
                    some: {
                        genre: {
                            name: {
                                equals: genre,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                landscapePosterUrl: true,
                releaseYear: true,
                status: true,
                type: true,
                animeDetail: { select: { totalEpisodes: true } },
                genres: true,
            },
        });
    }

    async countByGenre(genre, tx = prisma) {
        return tx.koleksi.count({
            where: {
                koleksiType: 'anime',
                publishStatus: 'published',
                animeDetail: { episodes: { some: {} } },
                genres: {
                    some: {
                        genre: {
                            name: {
                                equals: genre,
                                mode: 'insensitive'
                            }
                        }
                    }
                },
            },
        });
    }
    async getDistinct(field, tx = prisma) {
        if (field === 'type') {
            const [types, formats] = await Promise.all([
                tx.koleksi.findMany({
                    where: { koleksiType: 'anime', publishStatus: 'published', type: { not: null } },
                    distinct: ['type'],
                    select: { type: true },
                }),
                tx.animeDetail.findMany({
                    where: { format: { not: null }, koleksi: { koleksiType: 'anime', publishStatus: 'published' } },
                    distinct: ['format'],
                    select: { format: true },
                })
            ]);
            const merged = [...new Set([
                ...types.map(t => t.type),
                ...formats.map(f => f.format)
            ])].filter(Boolean).sort();
            return merged;
        }

        const results = await tx.koleksi.findMany({
            where: {
                koleksiType: 'anime',
                publishStatus: 'published',
                [field]: { not: null },
            },
            distinct: [field],
            select: { [field]: true },
            orderBy: { [field]: 'asc' },
        });
        return results.map(r => r[field]).filter(Boolean);
    }

    async getDistinctYears(tx = prisma) {
        const results = await tx.koleksi.findMany({
            where: {
                koleksiType: 'anime',
                publishStatus: 'published',
                releaseYear: { not: null },
            },
            distinct: ['releaseYear'],
            select: { releaseYear: true },
            orderBy: { releaseYear: 'desc' },
        });
        return results.map(r => r.releaseYear).filter(Boolean);
    }

    async getGenres(tx = prisma) {
        return tx.genre.findMany({
            orderBy: { name: 'asc' },
            select: { id: true, name: true, slug: true }
        });
    }

    async getGlobalStats(tx = prisma) {
        const [totalAnime, totalEpisodes] = await Promise.all([
            tx.koleksi.count({
                where: {
                    koleksiType: 'anime',
                    publishStatus: 'published',
                    animeDetail: { episodes: { some: {} } }
                }
            }),
            tx.episode.count({
                where: {
                    anime: {
                        koleksi: {
                            koleksiType: 'anime',
                            publishStatus: 'published'
                        }
                    }
                }
            })
        ]);

        return {
            totalAnime,
            totalEpisodes
        };
    }
    async findAllAdmin({ skip = 0, take = 20, filters = {} } = {}, tx = prisma) {
        return tx.koleksi.findMany({
            skip,
            take,
            where: this._buildAdminFilterWhere(filters),
            orderBy: this._buildOrderBy(filters.sort || 'newest'),
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                koleksiType: true,
                publishStatus: true,
                status: true,
                type: true,
                releaseYear: true,
                createdAt: true,
                animeDetail: { select: { id: true, totalEpisodes: true, format: true } },
                mapping: { select: { anilistId: true, nineanimeId: true } },
                genres: { select: { genre: { select: { name: true } } }, take: 3 },
                _count: { select: { pendingMappings: true } },
            },
        });
    }

    async countAllAdmin(filters = {}, tx = prisma) {
        return tx.koleksi.count({
            where: this._buildAdminFilterWhere(filters),
        });
    }

    async getAdminFilterOptions(tx = prisma) {
        const [types, statuses, years, genres] = await Promise.all([
            tx.koleksi.findMany({
                where: { koleksiType: 'anime', type: { not: null } },
                distinct: ['type'],
                select: { type: true },
                orderBy: { type: 'asc' },
            }),
            tx.koleksi.findMany({
                where: { koleksiType: 'anime', status: { not: null } },
                distinct: ['status'],
                select: { status: true },
                orderBy: { status: 'asc' },
            }),
            tx.koleksi.findMany({
                where: { koleksiType: 'anime', releaseYear: { not: null } },
                distinct: ['releaseYear'],
                select: { releaseYear: true },
                orderBy: { releaseYear: 'desc' },
            }),
            tx.genre.findMany({ orderBy: { name: 'asc' }, select: { name: true, slug: true } }),
        ]);
        return {
            types: types.map(t => t.type).filter(Boolean),
            statuses: statuses.map(s => s.status).filter(Boolean),
            years: years.map(y => y.releaseYear).filter(Boolean),
            genres,
        };
    }

    async findRecentlyUpdated(limit = 12, tx = prisma) {
        // Use DISTINCT ON to get the most recent episode per anime efficiently,
        // avoiding the issue where a single anime with hundreds of episodes
        // dominates the result set.
        const results = await tx.$queryRaw`
            SELECT k.id, k.title, k.slug, k.poster_url AS "posterUrl",
                   k.landscape_poster_url AS "landscapePosterUrl",
                   k.type, k.status, k.release_year AS "releaseYear",
                   k.synopsis,
                   ad.total_episodes AS "totalEpisodes",
                   latest_ep.latest_created_at AS "latestEpisodeAt"
            FROM (
                SELECT DISTINCT ON (ad.koleksi_id)
                       ad.koleksi_id,
                       e.created_at AS latest_created_at
                FROM episodes e
                JOIN anime_detail ad ON ad.id = e.anime_id
                ORDER BY ad.koleksi_id, e.created_at DESC NULLS LAST
            ) latest_ep
            JOIN koleksi k ON k.id = latest_ep.koleksi_id
            JOIN anime_detail ad ON ad.koleksi_id = k.id
            WHERE k.koleksi_type = 'anime'
              AND k.publish_status = 'published'
            ORDER BY latest_ep.latest_created_at DESC NULLS LAST
            LIMIT ${limit}
        `;

        return results.map(r => ({
            id: r.id,
            title: r.title,
            slug: r.slug,
            posterUrl: r.posterUrl,
            landscapePosterUrl: r.landscapePosterUrl,
            type: r.type,
            status: r.status,
            releaseYear: r.releaseYear,
            synopsis: r.synopsis,
            animeDetail: {
                totalEpisodes: r.totalEpisodes ? Number(r.totalEpisodes) : null,
            },
        }));
    }

    /**
     * Get most watched anime aggregated from watch history
     */
    async findMostWatched(limit = 12, tx = prisma) {
        // Use raw query for efficient aggregation
        const results = await tx.$queryRaw`
            SELECT k.id, k.title, k.slug, k.poster_url AS "posterUrl",
                   k.landscape_poster_url AS "landscapePosterUrl",
                   k.type, k.status, k.release_year AS "releaseYear",
                   k.synopsis,
                   COUNT(DISTINCT uwh.user_id) AS "watcherCount"
            FROM user_watch_histories uwh
            JOIN episodes e ON e.id = uwh.episode_id
            JOIN anime_detail ad ON ad.id = e.anime_id
            JOIN koleksi k ON k.id = ad.koleksi_id
            WHERE k.publish_status = 'published'
              AND k.koleksi_type = 'anime'
            GROUP BY k.id
            ORDER BY "watcherCount" DESC
            LIMIT ${limit}
        `;

        return results.map(r => ({
            ...r,
            watcherCount: Number(r.watcherCount),
        }));
    }

    /**
     * Admin: Get top favorited anime
     */
    async findTopFavorited(limit = 20, tx = prisma) {
        const results = await tx.$queryRaw`
            SELECT k.id, k.title, k.slug, k.poster_url AS "posterUrl",
                   k.type, k.status, k.release_year AS "releaseYear",
                   COUNT(uf.user_id) AS "favoriteCount"
            FROM user_favorites uf
            JOIN koleksi k ON k.id = uf.koleksi_id
            WHERE k.koleksi_type = 'anime'
            GROUP BY k.id
            ORDER BY "favoriteCount" DESC
            LIMIT ${limit}
        `;
        return results.map(r => ({ ...r, favoriteCount: Number(r.favoriteCount) }));
    }

    /**
     * Admin: Get top watched episodes
     */
    async findTopEpisodes(limit = 20, tx = prisma) {
        const results = await tx.$queryRaw`
            SELECT e.id, e.episode_number AS "episodeNumber", e.title AS "episodeTitle",
                   k.id AS "koleksiId", k.title AS "animeTitle", k.slug, k.poster_url AS "posterUrl",
                   COUNT(uwh.user_id) AS "watcherCount"
            FROM user_watch_histories uwh
            JOIN episodes e ON e.id = uwh.episode_id
            JOIN anime_detail ad ON ad.id = e.anime_id
            JOIN koleksi k ON k.id = ad.koleksi_id
            GROUP BY e.id, k.id
            ORDER BY "watcherCount" DESC
            LIMIT ${limit}
        `;
        return results.map(r => ({
            ...r,
            episodeNumber: Number(r.episodeNumber),
            watcherCount: Number(r.watcherCount),
        }));
    }

    /**
     * Admin: Get growth data for charts (users, anime, episodes over time)
     */
    async getGrowthStats(tx = prisma) {
        const [userGrowth, animeGrowth, episodeGrowth, watchTimeStats] = await Promise.all([
            tx.$queryRaw`
                SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
                FROM users WHERE created_at IS NOT NULL
                GROUP BY month ORDER BY month
            `,
            tx.$queryRaw`
                SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
                FROM koleksi WHERE koleksi_type = 'anime' AND created_at IS NOT NULL
                GROUP BY month ORDER BY month
            `,
            tx.$queryRaw`
                SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS count
                FROM episodes WHERE created_at IS NOT NULL
                GROUP BY month ORDER BY month
            `,
            tx.$queryRaw`
                SELECT DATE_TRUNC('month', updated_at) AS month,
                       SUM(watch_time_seconds) AS "totalSeconds",
                       COUNT(DISTINCT user_id) AS "uniqueUsers"
                FROM user_watch_histories WHERE updated_at IS NOT NULL
                GROUP BY month ORDER BY month
            `,
        ]);

        return {
            userGrowth: userGrowth.map(r => ({ month: r.month, count: Number(r.count) })),
            animeGrowth: animeGrowth.map(r => ({ month: r.month, count: Number(r.count) })),
            episodeGrowth: episodeGrowth.map(r => ({ month: r.month, count: Number(r.count) })),
            watchTimeStats: watchTimeStats.map(r => ({
                month: r.month,
                totalSeconds: Number(r.totalSeconds),
                uniqueUsers: Number(r.uniqueUsers),
            })),
        };
    }

    async getRecommendationsForUser(userId, limit = 10, tx = prisma) {
        // 1. Dapatkan daftar koleksiId yang sudah ditonton atau di-favorite
        const [watchHistories, favorites] = await Promise.all([
            tx.userWatchHistory.findMany({
                where: { userId, watchTimeSeconds: { gt: 10 } },
                select: { episode: { select: { anime: { select: { koleksiId: true } } } } }
            }),
            tx.userFavorite.findMany({
                where: { userId },
                select: { koleksiId: true }
            })
        ]);

        const excludedIds = new Set([
            ...watchHistories.map(h => h.episode?.anime?.koleksiId).filter(Boolean),
            ...favorites.map(f => f.koleksiId).filter(Boolean)
        ]);

        const excludedArray = Array.from(excludedIds);
        const recommendations = [];

        if (excludedArray.length > 0) {
            // --- FASE 1: Cari Hubungan (Sequel/Prequel) yang belum ditonton ---
            const relations = await tx.koleksiRelation.findMany({
                where: { sourceKoleksiId: { in: excludedArray } },
                select: { targetAnilistId: true }
            });
            const targetAnilistIds = [...new Set(relations.map(r => r.targetAnilistId).filter(Boolean))];

            if (targetAnilistIds.length > 0) {
                const unwatchedRelations = await tx.koleksi.findMany({
                    where: {
                        koleksiType: 'anime',
                        publishStatus: 'published',
                        id: { notIn: excludedArray },
                        mapping: { anilistId: { in: targetAnilistIds } },
                        animeDetail: { episodes: { some: {} } }
                    },
                    select: {
                        id: true, title: true, slug: true, posterUrl: true, landscapePosterUrl: true,
                        type: true, status: true, releaseYear: true, animeDetail: { select: { totalEpisodes: true } }
                    },
                    take: limit
                });
                recommendations.push(...unwatchedRelations);
            }

            // --- FASE 2: Genre Similarity jika masih ada slot kosong ---
            if (recommendations.length < limit) {
                // Hitung skor genre pengguna
                const userGenres = await tx.koleksiGenre.findMany({
                    where: { koleksiId: { in: excludedArray } },
                    select: { genreId: true }
                });
                
                if (userGenres.length > 0) {
                    const genreCounts = {};
                    for (const ug of userGenres) {
                        genreCounts[ug.genreId] = (genreCounts[ug.genreId] || 0) + 1;
                    }
                    
                    // Ambil 5 genre teratas
                    const topGenreIds = Object.entries(genreCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(entry => entry[0]);

                    if (topGenreIds.length > 0) {
                        const needed = limit - recommendations.length;
                        const recommendedIds = recommendations.map(r => r.id);
                        const finalExcluded = [...excludedArray, ...recommendedIds];
                        
                        const { Prisma } = require('@kolektaku/database');
                        const excludedCondition = finalExcluded.length > 0 
                            ? Prisma.sql`AND k.id NOT IN (${Prisma.join(finalExcluded)})`
                            : Prisma.empty;

                        // Gunakan Query Raw untuk melakukan match count
                        // Ini akan meranking anime berdasarkan seberapa banyak genre mereka cocok dengan top 5 genre user
                        const genreSimilarResults = await tx.$queryRaw`
                            SELECT k.id, k.title, k.slug, k.poster_url AS "posterUrl", k.landscape_poster_url AS "landscapePosterUrl", 
                                   k.type, k.status, k.release_year AS "releaseYear",
                                   COUNT(kg.genre_id) AS match_score
                            FROM koleksi k
                            JOIN koleksi_genres kg ON kg.koleksi_id = k.id
                            JOIN anime_detail ad ON ad.koleksi_id = k.id
                            WHERE k.koleksi_type = 'anime' 
                              AND k.publish_status = 'published'
                              ${excludedCondition}
                              AND kg.genre_id::text IN (${Prisma.join(topGenreIds)})
                              AND EXISTS (SELECT 1 FROM episodes e WHERE e.anime_id = ad.id)
                            GROUP BY k.id
                            ORDER BY match_score DESC, k.created_at DESC
                            LIMIT ${needed}
                        `;
                        
                        // Formatting result to match Prisma findMany format
                        const formattedSimilars = genreSimilarResults.map(r => ({
                            id: r.id, title: r.title, slug: r.slug, posterUrl: r.posterUrl, landscapePosterUrl: r.landscapePosterUrl,
                            type: r.type, status: r.status, releaseYear: r.releaseYear
                        }));
                        recommendations.push(...formattedSimilars);
                    }
                }
            }

            // --- FASE 3: Fallback ke Most Watched (Hanya jika user punya minimal 1 history/favorite) ---
            // Ini untuk memastikan user yang sudah interaksi tetap melihat sesuatu meskipun genre/relation tidak pas.
            if (recommendations.length < limit) {
                const needed = limit - recommendations.length;
                const recommendedIds = recommendations.map(r => r.id);
                const finalExcluded = [...excludedArray, ...recommendedIds];
                
                const { Prisma } = require('@kolektaku/database');
                const excludedCondition = finalExcluded.length > 0 
                    ? Prisma.sql`AND k.id NOT IN (${Prisma.join(finalExcluded)})`
                    : Prisma.empty;
                
                const fallbackResults = await tx.$queryRaw`
                    SELECT k.id, k.title, k.slug, k.poster_url AS "posterUrl", k.landscape_poster_url AS "landscapePosterUrl", 
                           k.type, k.status, k.release_year AS "releaseYear",
                           CAST(COALESCE((SELECT COUNT(*) FROM user_watch_histories wh WHERE wh.episode_id IN (SELECT id FROM episodes WHERE anime_id = k.id)), 0) AS INTEGER) as popularity_score
                    FROM koleksi k
                    JOIN anime_detail ad ON ad.koleksi_id = k.id
                    WHERE k.koleksi_type = 'anime' 
                      AND k.publish_status = 'published'
                      ${excludedCondition}
                      AND EXISTS (SELECT 1 FROM episodes e WHERE e.anime_id = ad.id)
                    ORDER BY popularity_score DESC, k.created_at DESC
                    LIMIT ${needed}
                `;
                
                const formattedFallbacks = fallbackResults.map(r => ({
                    id: r.id, title: r.title, slug: r.slug, posterUrl: r.posterUrl, landscapePosterUrl: r.landscapePosterUrl,
                    type: r.type, status: r.status, releaseYear: r.releaseYear
                }));
                recommendations.push(...formattedFallbacks);
            }
        }

        return recommendations;
    }
}

module.exports = new AnimeRepository();
