const prisma = require('../config/prisma');

class AdminRepository {
    findAllAnime({ skip = 0, take = 20, search, mappedStatus } = {}, tx = prisma) {
        const where = { koleksiType: 'anime' };
        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        if (mappedStatus === 'mapped') {
            where.mapping = { isNot: null };
        } else if (mappedStatus === 'unmapped') {
            where.mapping = { is: null };
        }

        return tx.koleksi.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                koleksiType: true,
                publishStatus: true,
                mapping: {
                    select: {
                        anilistId: true,
                        nineanimeId: true
                    }
                }
            },
        });
    }

    countAnime({ search, mappedStatus } = {}, tx = prisma) {
        const where = { koleksiType: 'anime' };
        if (search) {
            where.title = { contains: search, mode: 'insensitive' };
        }

        if (mappedStatus === 'mapped') {
            where.mapping = { isNot: null };
        } else if (mappedStatus === 'unmapped') {
            where.mapping = { is: null };
        }

        return tx.koleksi.count({ where });
    }

    findAnimeById(id, tx = prisma) {
        return tx.koleksi.findUnique({
            where: { id },
            include: {
                animeDetail: { include: { episodes: { include: { sources: true }, orderBy: { episodeNumber: 'asc' } } } },
                genres: { include: { genre: true } },
                studios: { include: { studio: true } },
                mapping: true,
            },
        });
    }

    createAnime(data, tx = prisma) {
        const now = new Date();
        const slug = data.title
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        return tx.koleksi.create({
            data: {
                title: data.title,
                slug,
                posterUrl: data.posterUrl || null,
                landscapePosterUrl: data.landscapePosterUrl || null,
                altTitles: data.altTitles || null,
                synopsis: data.synopsis || null,
                type: data.type || null,
                status: data.status || null,
                releaseYear: data.releaseYear || null,
                koleksiType: data.koleksiType || 'anime',
                publishStatus: data.publishStatus || 'published',
                isNsfw: data.isNsfw || false,
                contentRating: data.contentRating || null,
                createdAt: now,
                animeDetail: data.animeDetail
                    ? {
                          create: {
                              format: data.animeDetail.format || null,
                              totalEpisodes: data.animeDetail.totalEpisodes || null,
                              epsDuration: data.animeDetail.epsDuration || null,
                              startDate: data.animeDetail.startDate ? new Date(data.animeDetail.startDate) : null,
                              endDate: data.animeDetail.endDate ? new Date(data.animeDetail.endDate) : null,
                              season: data.animeDetail.season || null,
                              source: data.animeDetail.source || null,
                              romaji: data.animeDetail.romaji || null,
                              trailerUrl: data.animeDetail.trailerUrl || null,
                          },
                      }
                    : undefined,
            },
            include: { animeDetail: true },
        });
    }

    updateAnime(id, data, tx = prisma) {
        const updateData = {};
        if (data.title !== undefined) {
            updateData.title = data.title;
            updateData.slug = data.title
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }
        if (data.posterUrl !== undefined) updateData.posterUrl = data.posterUrl;
        if (data.landscapePosterUrl !== undefined) updateData.landscapePosterUrl = data.landscapePosterUrl;
        if (data.altTitles !== undefined) updateData.altTitles = data.altTitles;
        if (data.synopsis !== undefined) updateData.synopsis = data.synopsis;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.releaseYear !== undefined) updateData.releaseYear = data.releaseYear;
        if (data.publishStatus !== undefined) updateData.publishStatus = data.publishStatus;
        if (data.isNsfw !== undefined) updateData.isNsfw = data.isNsfw;
        if (data.contentRating !== undefined) updateData.contentRating = data.contentRating;

        return tx.koleksi.update({
            where: { id },
            data: updateData,
            include: { animeDetail: true },
        });
    }

    toggleAnimeVisibility(id, publishStatus, tx = prisma) {
        return tx.koleksi.update({
            where: { id },
            data: { publishStatus },
        });
    }

    deleteAnime(id, tx = prisma) {
        return tx.koleksi.delete({ where: { id } });
    }

    createStudio(data, tx = prisma) {
        return tx.studio.create({
            data: {
                anilistId: data.anilistId,
                name: data.name,
                isAnimationStudio: data.isAnimationStudio || false,
                description: data.description || null,
            },
        });
    }

    updateStudio(id, data, tx = prisma) {
        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.isAnimationStudio !== undefined) updateData.isAnimationStudio = data.isAnimationStudio;
        if (data.description !== undefined) updateData.description = data.description;
        return tx.studio.update({ where: { id }, data: updateData });
    }

    deleteStudio(id, tx = prisma) {
        return tx.studio.delete({ where: { id } });
    }

    findAllStudios({ skip = 0, take = 20, search } = {}, tx = prisma) {
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        return tx.studio.findMany({ skip, take, where, orderBy: { name: 'asc' } });
    }

    countStudios({ search } = {}, tx = prisma) {
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        return tx.studio.count({ where });
    }

    findStudioById(id, tx = prisma) {
        return tx.studio.findUnique({ where: { id } });
    }

    createVA(data, tx = prisma) {
        return tx.voiceActor.create({
            data: {
                anilistId: data.anilistId,
                name: data.name,
                imageUrl: data.imageUrl || null,
            },
        });
    }

    updateVA(id, data, tx = prisma) {
        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
        return tx.voiceActor.update({ where: { id }, data: updateData });
    }

    deleteVA(id, tx = prisma) {
        return tx.voiceActor.delete({ where: { id } });
    }

    findAllVAs({ skip = 0, take = 20, search } = {}, tx = prisma) {
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        return tx.voiceActor.findMany({ skip, take, where, orderBy: { name: 'asc' } });
    }

    countVAs({ search } = {}, tx = prisma) {
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        return tx.voiceActor.count({ where });
    }

    findVAById(id, tx = prisma) {
        return tx.voiceActor.findUnique({ where: { id } });
    }

    createCharacter(data, tx = prisma) {
        return tx.character.create({
            data: {
                name: data.name,
                imageUrl: data.imageUrl || null,
            },
        });
    }

    updateCharacter(id, data, tx = prisma) {
        const updateData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
        return tx.character.update({ where: { id }, data: updateData });
    }

    deleteCharacter(id, tx = prisma) {
        return tx.character.delete({ where: { id } });
    }

    findAllCharacters({ skip = 0, take = 20, search } = {}, tx = prisma) {
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        return tx.character.findMany({ skip, take, where, orderBy: { name: 'asc' } });
    }

    countCharacters({ search } = {}, tx = prisma) {
        const where = {};
        if (search) where.name = { contains: search, mode: 'insensitive' };
        return tx.character.count({ where });
    }

    findCharacterById(id, tx = prisma) {
        return tx.character.findUnique({ where: { id } });
    }

    createGenre(data, tx = prisma) {
        const slug = data.name
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        return tx.genre.create({
            data: {
                name: data.name,
                slug,
                isNsfw: data.isNsfw || false,
            },
        });
    }

    updateGenre(id, data, tx = prisma) {
        const updateData = {};
        if (data.name !== undefined) {
            updateData.name = data.name;
            updateData.slug = data.name
                ?.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
        }
        if (data.isNsfw !== undefined) updateData.isNsfw = data.isNsfw;
        return tx.genre.update({ where: { id }, data: updateData });
    }

    deleteGenre(id, tx = prisma) {
        return tx.genre.delete({ where: { id } });
    }

    findAllGenres({ skip = 0, take = 50 } = {}, tx = prisma) {
        return tx.genre.findMany({ skip, take, orderBy: { name: 'asc' } });
    }

    countGenres(tx = prisma) {
        return tx.genre.count();
    }

    findGenreById(id, tx = prisma) {
        return tx.genre.findUnique({ where: { id } });
    }

    countVouchers(tx = prisma) {
        return tx.voucherCode.count();
    }

    countPlans(tx = prisma) {
        return tx.membershipPlan.count();
    }

    findAllEpisodes({ animeDetailId, skip = 0, take = 50 } = {}, tx = prisma) {
        return tx.episode.findMany({
            skip,
            take,
            where: { animeId: animeDetailId },
            orderBy: { episodeNumber: 'asc' },
            include: { sources: true },
        });
    }

    countEpisodes({ animeDetailId } = {}, tx = prisma) {
        return tx.episode.count({ where: { animeId: animeDetailId } });
    }

    createEpisode(animeDetailId, data, tx = prisma) {
        const now = new Date();
        return tx.episode.create({
            data: {
                animeId: animeDetailId,
                episodeNumber: data.episodeNumber ? parseFloat(data.episodeNumber) : null,
                title: data.title || null,
                createdAt: now,
                updatedAt: now,
            },
            include: { sources: true },
        });
    }

    updateEpisode(id, data, tx = prisma) {
        const updateData = { updatedAt: new Date() };
        if (data.episodeNumber !== undefined) updateData.episodeNumber = parseFloat(data.episodeNumber);
        if (data.title !== undefined) updateData.title = data.title;
        return tx.episode.update({
            where: { id },
            data: updateData,
            include: { sources: true },
        });
    }

    deleteEpisode(id, tx = prisma) {
        return tx.episode.delete({ where: { id } });
    }

    findEpisodeSources(episodeId, tx = prisma) {
        return tx.episodeSource.findMany({
            where: { episodeId },
            orderBy: { createdAt: 'asc' },
        });
    }

    createEpisodeSource(episodeId, data, tx = prisma) {
        return tx.episodeSource.create({
            data: {
                episodeId,
                serverName: data.serverName || null,
                audio: data.audio || 'sub',
                streamType: data.streamType || 'hls',
                urlSource: data.urlSource || null,
                subtitleTracks: data.subtitleTracks || null,
                externalId: data.externalId || null,
                isScraper: data.isScraper || false,
                createdAt: new Date(),
            },
        });
    }

    updateEpisodeSource(id, data, tx = prisma) {
        const updateData = {};
        if (data.serverName !== undefined) updateData.serverName = data.serverName;
        if (data.audio !== undefined) updateData.audio = data.audio;
        if (data.streamType !== undefined) updateData.streamType = data.streamType;
        if (data.urlSource !== undefined) updateData.urlSource = data.urlSource;
        if (data.subtitleTracks !== undefined) updateData.subtitleTracks = data.subtitleTracks;
        if (data.externalId !== undefined) updateData.externalId = data.externalId;
        if (data.isScraper !== undefined) updateData.isScraper = data.isScraper;
        return tx.episodeSource.update({ where: { id }, data: updateData });
    }

    deleteEpisodeSource(id, tx = prisma) {
        return tx.episodeSource.delete({ where: { id } });
    }

    deleteAllEpisodes(animeDetailId, tx = prisma) {
        return tx.episode.deleteMany({
            where: { animeId: animeDetailId }
        });
    }

    countTotalEpisodes(tx = prisma) {
        return tx.episode.count();
    }
}

module.exports = new AdminRepository();
