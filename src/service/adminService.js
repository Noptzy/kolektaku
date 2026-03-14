const adminRepository = require('../repository/adminRepository');
const auditLogRepository = require('../repository/auditLogRepository');
const userRepository = require('../repository/userRepository');

class AdminService {
    _paginate(data, total, page, limit) {
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    // ─── Anime ───
    async getAllAnime(page = 1, limit = 20, search = null) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            adminRepository.findAllAnime({ skip, take: limit, search }),
            adminRepository.countAnime({ search }),
        ]);
        return this._paginate(data, total, page, limit);
    }

    async createAnime(adminId, data) {
        const anime = await adminRepository.createAnime(data);
        await auditLogRepository.createLog({
            adminId,
            action: 'CREATE_ANIME',
            entityType: 'Koleksi',
            entityId: anime.id,
            changes: { title: data.title, type: data.type },
        });
        return anime;
    }

    async updateAnime(adminId, id, data) {
        const anime = await adminRepository.updateAnime(id, data);
        await auditLogRepository.createLog({
            adminId,
            action: 'UPDATE_ANIME',
            entityType: 'Koleksi',
            entityId: id,
            changes: data,
        });
        return anime;
    }

    async toggleAnimeVisibility(adminId, id, publishStatus) {
        const anime = await adminRepository.toggleAnimeVisibility(id, publishStatus);
        await auditLogRepository.createLog({
            adminId,
            action: publishStatus === 'hidden' ? 'HIDE_ANIME' : 'SHOW_ANIME',
            entityType: 'Koleksi',
            entityId: id,
            changes: { publishStatus },
        });
        return anime;
    }

    async deleteAnime(adminId, id) {
        await auditLogRepository.createLog({
            adminId,
            action: 'DELETE_ANIME',
            entityType: 'Koleksi',
            entityId: id,
            changes: null,
        });
        return adminRepository.deleteAnime(id);
    }

    // ─── Studio ───
    async getAllStudios(page = 1, limit = 20, search = null) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            adminRepository.findAllStudios({ skip, take: limit, search }),
            adminRepository.countStudios({ search }),
        ]);
        return this._paginate(data, total, page, limit);
    }

    async getStudioById(id) {
        return adminRepository.findStudioById(id);
    }

    async createStudio(adminId, data) {
        const studio = await adminRepository.createStudio(data);
        await auditLogRepository.createLog({
            adminId, action: 'CREATE_STUDIO', entityType: 'Studio', entityId: studio.id,
            changes: { name: data.name },
        });
        return studio;
    }

    async updateStudio(adminId, id, data) {
        const studio = await adminRepository.updateStudio(id, data);
        await auditLogRepository.createLog({
            adminId, action: 'UPDATE_STUDIO', entityType: 'Studio', entityId: id, changes: data,
        });
        return studio;
    }

    async deleteStudio(adminId, id) {
        await auditLogRepository.createLog({
            adminId, action: 'DELETE_STUDIO', entityType: 'Studio', entityId: id, changes: null,
        });
        return adminRepository.deleteStudio(id);
    }

    // ─── VA ───
    async getAllVAs(page = 1, limit = 20, search = null) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            adminRepository.findAllVAs({ skip, take: limit, search }),
            adminRepository.countVAs({ search }),
        ]);
        return this._paginate(data, total, page, limit);
    }

    async getVAById(id) {
        return adminRepository.findVAById(id);
    }

    async createVA(adminId, data) {
        const va = await adminRepository.createVA(data);
        await auditLogRepository.createLog({
            adminId, action: 'CREATE_VA', entityType: 'VoiceActor', entityId: va.id,
            changes: { name: data.name },
        });
        return va;
    }

    async updateVA(adminId, id, data) {
        const va = await adminRepository.updateVA(id, data);
        await auditLogRepository.createLog({
            adminId, action: 'UPDATE_VA', entityType: 'VoiceActor', entityId: id, changes: data,
        });
        return va;
    }

    async deleteVA(adminId, id) {
        await auditLogRepository.createLog({
            adminId, action: 'DELETE_VA', entityType: 'VoiceActor', entityId: id, changes: null,
        });
        return adminRepository.deleteVA(id);
    }

    // ─── Character ───
    async getAllCharacters(page = 1, limit = 20, search = null) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            adminRepository.findAllCharacters({ skip, take: limit, search }),
            adminRepository.countCharacters({ search }),
        ]);
        return this._paginate(data, total, page, limit);
    }

    async getCharacterById(id) {
        return adminRepository.findCharacterById(id);
    }

    async createCharacter(adminId, data) {
        const char = await adminRepository.createCharacter(data);
        await auditLogRepository.createLog({
            adminId, action: 'CREATE_CHARACTER', entityType: 'Character', entityId: char.id,
            changes: { name: data.name },
        });
        return char;
    }

    async updateCharacter(adminId, id, data) {
        const char = await adminRepository.updateCharacter(id, data);
        await auditLogRepository.createLog({
            adminId, action: 'UPDATE_CHARACTER', entityType: 'Character', entityId: id, changes: data,
        });
        return char;
    }

    async deleteCharacter(adminId, id) {
        await auditLogRepository.createLog({
            adminId, action: 'DELETE_CHARACTER', entityType: 'Character', entityId: id, changes: null,
        });
        return adminRepository.deleteCharacter(id);
    }

    // ─── Genre ───
    async getAllGenres(page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            adminRepository.findAllGenres({ skip, take: limit }),
            adminRepository.countGenres(),
        ]);
        return this._paginate(data, total, page, limit);
    }

    async getGenreById(id) {
        return adminRepository.findGenreById(id);
    }

    async createGenre(adminId, data) {
        const genre = await adminRepository.createGenre(data);
        await auditLogRepository.createLog({
            adminId, action: 'CREATE_GENRE', entityType: 'Genre', entityId: genre.id,
            changes: { name: data.name },
        });
        return genre;
    }

    async updateGenre(adminId, id, data) {
        const genre = await adminRepository.updateGenre(id, data);
        await auditLogRepository.createLog({
            adminId, action: 'UPDATE_GENRE', entityType: 'Genre', entityId: id, changes: data,
        });
        return genre;
    }

    async deleteGenre(adminId, id) {
        await auditLogRepository.createLog({
            adminId, action: 'DELETE_GENRE', entityType: 'Genre', entityId: id, changes: null,
        });
        return adminRepository.deleteGenre(id);
    }

    // ─── Anime Detail (single) ───
    async getAnimeById(id) {
        return adminRepository.findAnimeById(id);
    }

    // ─── Episode ───
    async getEpisodes(animeDetailId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            adminRepository.findAllEpisodes({ animeDetailId, skip, take: limit }),
            adminRepository.countEpisodes({ animeDetailId }),
        ]);
        return this._paginate(data, total, page, limit);
    }

    async createEpisode(adminId, animeDetailId, data) {
        const episode = await adminRepository.createEpisode(animeDetailId, data);
        await auditLogRepository.createLog({
            adminId, action: 'CREATE_EPISODE', entityType: 'Episode', entityId: episode.id,
            changes: { episodeNumber: data.episodeNumber, title: data.title },
        });
        return episode;
    }

    async updateEpisode(adminId, id, data) {
        const episode = await adminRepository.updateEpisode(id, data);
        await auditLogRepository.createLog({
            adminId, action: 'UPDATE_EPISODE', entityType: 'Episode', entityId: id, changes: data,
        });
        return episode;
    }

    async deleteEpisode(adminId, id) {
        await auditLogRepository.createLog({
            adminId, action: 'DELETE_EPISODE', entityType: 'Episode', entityId: id, changes: null,
        });
        return adminRepository.deleteEpisode(id);
    }

    // ─── Episode Source ───
    async getEpisodeSources(episodeId) {
        return adminRepository.findEpisodeSources(episodeId);
    }

    async createEpisodeSource(adminId, episodeId, data) {
        const source = await adminRepository.createEpisodeSource(episodeId, data);
        await auditLogRepository.createLog({
            adminId, action: 'CREATE_SOURCE', entityType: 'EpisodeSource', entityId: source.id,
            changes: { serverName: data.serverName, urlSource: data.urlSource },
        });
        return source;
    }

    async updateEpisodeSource(adminId, id, data) {
        const source = await adminRepository.updateEpisodeSource(id, data);
        await auditLogRepository.createLog({
            adminId, action: 'UPDATE_SOURCE', entityType: 'EpisodeSource', entityId: id, changes: data,
        });
        return source;
    }

    async deleteEpisodeSource(adminId, id) {
        await auditLogRepository.createLog({
            adminId, action: 'DELETE_SOURCE', entityType: 'EpisodeSource', entityId: id, changes: null,
        });
        return adminRepository.deleteEpisodeSource(id);
    }

    async getDashboardStats() {
        const [users, anime, episodes, vouchers, plans] = await Promise.all([
            userRepository.countUsers(),
            adminRepository.countAnime(),
            adminRepository.countTotalEpisodes(),
            adminRepository.countVouchers(),
            adminRepository.countPlans()
        ]);

        return {
            users,
            anime,
            episodes,
            vouchers,
            plans
        };
    }
}

module.exports = new AdminService();
