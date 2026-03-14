const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');
const auditLogRepository = require('../../repository/auditLogRepository');
const animeRepository = require('../../repository/animeRepository');

// ─── Anime ───
exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || null;

        const result = await adminService.getAllAnime(page, limit, search);
        res.status(200).json(resHandler.success('Anime retrieved', result));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to get anime'));
    }
};

exports.getStats = async (req, res) => {
    try {
        const stats = await adminService.getDashboardStats();
        res.status(200).json(resHandler.success('Dashboard stats retrieved', stats));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to get dashboard stats'));
    }
};

exports.getById = async (req, res) => {
    try {
        const anime = await adminService.getAnimeById(req.params.id);
        if (!anime) return res.status(404).json(resHandler.error('Anime not found'));
        res.status(200).json(resHandler.success('Anime detail', anime));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to get anime'));
    }
};

exports.createAnime = async (req, res) => {
    try {
        const anime = await adminService.createAnime(req.user.id, req.body);
        res.status(201).json(resHandler.success('Anime created', anime));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create anime'));
    }
};

exports.updateAnime = async (req, res) => {
    try {
        const anime = await adminService.updateAnime(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('Anime updated', anime));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to update anime'));
    }
};

exports.toggleVisibility = async (req, res) => {
    try {
        const { publishStatus } = req.body;
        if (!['published', 'hidden', 'draft', 'rejected'].includes(publishStatus)) {
            return res.status(400).json(resHandler.error('Invalid publishStatus'));
        }
        const anime = await adminService.toggleAnimeVisibility(req.user.id, req.params.id, publishStatus);
        res.status(200).json(resHandler.success(`Anime ${publishStatus}`, anime));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to toggle visibility'));
    }
};

exports.deleteAnime = async (req, res) => {
    try {
        await adminService.deleteAnime(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Anime deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to delete anime'));
    }
};

exports.triggerScrape = async (req, res) => {
    try {
        const { type } = req.body;
        const animeId = req.params.id;

        if (!['detail', 'episodes'].includes(type)) {
            return res.status(400).json(resHandler.error('Invalid scrape type. Must be "detail" or "episodes"'));
        }

        const anime = await adminService.getAnimeById(animeId);
        if (!anime) return res.status(404).json(resHandler.error('Anime not found'));

        // Log the trigger action immediately
        const actionName = type === 'detail' ? 'TRIGGER_SCRAPE_DETAIL' : 'TRIGGER_SCRAPE_EPISODES';
        await auditLogRepository.createLog({
            adminId: req.user.id,
            action: actionName,
            entityType: 'Koleksi',
            entityId: animeId,
            changes: { title: anime.title, type, status: 'disabled', anilistId: anime.mapping?.anilistId || null },
        });

        res.status(200).json(resHandler.success(`Scraping job disabled (RabbitMQ removed) for ${type}`));
    } catch (error) {
        console.error('triggerScrape error:', error);
        res.status(500).json(resHandler.error(error.message || 'Failed to trigger scrape'));
    }
};

exports.manualAddAnime = async (req, res) => {
    try {
        const { anilistUrl, nineanimeUrl, malUrl, force = false } = req.body;

        if (!anilistUrl) {
            return res.status(400).json(resHandler.error('AniList URL wajib diisi.'));
        }

        // Helper to extract IDs from various URLs
        const extractId = (url, type) => {
            if (!url || typeof url !== 'string') return null;
            const cleanUrl = url.split('?')[0].split('#')[0].replace(/\/$/, '');

            if (type === 'anilist') {
                if (cleanUrl.match(/^\d+$/)) return parseInt(cleanUrl);
                const match = cleanUrl.match(/anime\/(\d+)/);
                return match ? parseInt(match[1]) : null;
            }

            if (type === 'mal') {
                if (cleanUrl.match(/^\d+$/)) return parseInt(cleanUrl);
                const match = cleanUrl.match(/anime\/(\d+)/);
                return match ? parseInt(match[1]) : null;
            }

            if (type === 'nineanime') {
                const match = cleanUrl.match(/-(\d+)$/);
                if (match) return match[1];
                const parts = cleanUrl.split('-');
                const last = parts[parts.length - 1];
                return last && last.match(/^\d+$/) ? last : null;
            }
            return null;
        };

        // Smart Extraction: Identify which link is which regardless of which field it's in
        const allUrls = [anilistUrl, nineanimeUrl, malUrl].filter(Boolean);

        let anilistId = extractId(anilistUrl, 'anilist');
        let malId = null;
        let nineanimeId = null;

        for (const url of allUrls) {
            if (url.includes('anilist.co') && !anilistId) anilistId = extractId(url, 'anilist');
            if (url.includes('myanimelist.net') && !malId) malId = extractId(url, 'mal');
            if (url.includes('9animetv.to') && !nineanimeId) nineanimeId = extractId(url, 'nineanime');
        }

        // Fallback to specific fields if still null
        if (!malId) malId = extractId(malUrl, 'mal');
        if (!nineanimeId) nineanimeId = extractId(nineanimeUrl, 'nineanime');

        if (!anilistId) {
            return res.status(400).json(resHandler.error('ID AniList tidak ditemukan. Pastikan link AniList valid.'));
        }

        // Check if AniList ID is already used
        const existingMapping = await animeRepository.findByAnilistId(anilistId);
        if (existingMapping && !force) {
            return res.status(200).json({
                status: 'warning',
                message: `AniList ID ${anilistId} sudah terhubung dengan "${existingMapping.title}". Apakah Anda ingin tetap melanjutkan (update data)?`,
                data: {
                    existingAnime: {
                        id: existingMapping.id,
                        title: existingMapping.title,
                        slug: existingMapping.slug,
                    },
                },
            });
        }

        console.log(
            `[Admin] Manual Add skipped: AniList=${anilistId}, MAL=${malId}, 9Anime=${nineanimeId} (RabbitMQ removed)`,
        );

        await auditLogRepository.createLog({
            adminId: req.user.id,
            action: 'TRIGGER_MANUAL_ADD_DISABLED',
            entityType: 'Koleksi',
            entityId: null,
            changes: { anilistUrl, malUrl, nineanimeUrl, anilistId, malId, nineanimeId, status: 'disabled' },
        });

        res.status(200).json(resHandler.success('Fitur manual add sementara dinonaktifkan (RabbitMQ dihapus).'));
    } catch (error) {
        console.error('manualAddAnime error:', error);
        res.status(500).json(resHandler.error('Internal Server Error: ' + error.message));
    }
};
