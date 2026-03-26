const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');
const rabbitMQ = require('../../utils/rabbitmq');
const auditLogRepository = require('../../repository/auditLogRepository');
const animeRepository = require('../../repository/animeRepository');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const filters = {
            search: req.query.search || null,
            mappedStatus: req.query.mappedStatus || null,
            hasEpisodes: req.query.hasEpisodes || null,
            publishStatus: req.query.publishStatus || null,
            type: req.query.type || null,
            status: req.query.status || null,
            year: req.query.year || null,
            genre: req.query.genre || null,
            sort: req.query.sort || 'newest',
        };
        // Clean null values
        Object.keys(filters).forEach(k => { if (filters[k] === null) delete filters[k]; });
        
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            animeRepository.findAllAdmin({ skip, take: limit, filters }),
            animeRepository.countAllAdmin(filters),
        ]);
        const totalPages = Math.ceil(total / limit);
        res.status(200).json(resHandler.success('Anime retrieved', { data, total, page, limit, totalPages }));
    } catch (error) {
        console.error('getAll admin anime error:', error);
        res.status(500).json(resHandler.error(error.message || 'Failed to get anime'));
    }
};

exports.getFilterOptions = async (req, res) => {
    try {
        const options = await animeRepository.getAdminFilterOptions();
        res.status(200).json(resHandler.success('Filter options', options));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to get filter options'));
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

        const queueName = 'scraping_tasks';
        const payload = {
            action: 'trigger_scrape',
            type: type,
            animeId: animeId,
            anilistId: anime.mapping?.anilistId || null,
            adminId: req.user.id,
            title: anime.title,
        };

        // We don't shard scraping_tasks as there is only one worker for manual tasks usually,
        // but we pass shard: false to bypass sharding logic in our rabbitMQ client.
        await rabbitMQ.produceMessage(queueName, payload, { shard: false });

        const actionName = type === 'detail' ? 'TRIGGER_SCRAPE_DETAIL' : 'TRIGGER_SCRAPE_EPISODES';
        await auditLogRepository.createLog({
            adminId: req.user.id,
            action: actionName,
            entityType: 'Koleksi',
            entityId: animeId,
            changes: { title: anime.title, type, status: 'queued', anilistId: anime.mapping?.anilistId || null },
        });

        res.status(200).json(resHandler.success(`Scraping job queued for ${type}`));
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

        const allUrls = [anilistUrl, nineanimeUrl, malUrl].filter(Boolean);
        
        let anilistId = extractId(anilistUrl, 'anilist');
        let malId = null;
        let nineanimeId = null;

        for (const url of allUrls) {
            if (url.includes('anilist.co') && !anilistId) anilistId = extractId(url, 'anilist');
            if (url.includes('myanimelist.net') && !malId) malId = extractId(url, 'mal');
            if (url.includes('9animetv.to') && !nineanimeId) nineanimeId = extractId(url, 'nineanime');
        }

        if (!malId) malId = extractId(malUrl, 'mal');
        if (!nineanimeId) nineanimeId = extractId(nineanimeUrl, 'nineanime');

        if (!anilistId) {
            return res.status(400).json(resHandler.error('ID AniList tidak ditemukan. Pastikan link AniList valid.'));
        }

        const existingMapping = await animeRepository.findByAnilistId(anilistId);
        if (existingMapping && !force) {
            return res.status(200).json({
                status: 'warning',
                message: `AniList ID ${anilistId} sudah terhubung dengan "${existingMapping.title}". Apakah Anda ingin tetap melanjutkan (update data)?`,
                data: {
                    existingAnime: {
                        id: existingMapping.id,
                        title: existingMapping.title,
                        slug: existingMapping.slug
                    }
                }
            });
        }

        console.log(`[Admin] Manual Add queued: AniList=${anilistId}, MAL=${malId}, 9Anime=${nineanimeId}`);

        const queueName = 'scraping_tasks';
        const payload = {
            action: 'manual_add',
            anilistId,
            nineanimeId,
            malId,
            adminId: req.user.id
        };

        await rabbitMQ.produceMessage(queueName, payload, { shard: false });

        await auditLogRepository.createLog({
            adminId: req.user.id,
            action: 'TRIGGER_MANUAL_ADD',
            entityType: 'Koleksi',
            entityId: null,
            changes: { anilistUrl, malUrl, nineanimeUrl, anilistId, malId, nineanimeId },
        });

        res.status(200).json(resHandler.success('Job manual add berhasil dimasukkan ke antrian.'));
    } catch (error) {
        console.error('manualAddAnime error:', error);
        res.status(500).json(resHandler.error('Internal Server Error: ' + error.message));
    }
};

exports.triggerBatchMapping = async (req, res) => {
    try {
        const rabbitMQ = require('../../utils/rabbitmq');
        const queueName = 'scraping_tasks';
        const payload = {
            action: 'batch_map_9anime',
            adminId: req.user.id
        };

        await rabbitMQ.produceMessage(queueName, payload, { shard: false });

        await require('../../repository/auditLogRepository').createLog({
            adminId: req.user.id,
            action: 'TRIGGER_BATCH_MAPPING',
            entityType: 'System',
            entityId: null,
            changes: { message: 'Queued batch mapping task to worker via RabbitMQ' },
        });

        res.status(200).json(require('../../utils/resHandler').success('Batch mapping task queued to worker'));
    } catch (error) {
        console.error('triggerBatchMapping error:', error);
        res.status(500).json(require('../../utils/resHandler').error('Internal Server Error: ' + error.message));
    }
};
