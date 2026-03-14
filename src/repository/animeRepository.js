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
        
        // Add the extensive search OR conditions
        where.AND = [
            {
                OR: [
                    { title: { contains: keyword, mode: 'insensitive' } },
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

        return tx.koleksi.findMany({
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
    }

    async countSearchFuzzy(keyword, filters = {}, tx = prisma) {
        const where = this._buildFilterWhere(filters);
        
        where.AND = [
            {
                OR: [
                    { title: { contains: keyword, mode: 'insensitive' } },
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

        return tx.koleksi.count({
            where,
        });
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
                    // <-- Changed from voice_actors to voiceActor
                    select: {
                        id: true, // It's usually good practice to include the ID too
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
}

module.exports = new AnimeRepository();
