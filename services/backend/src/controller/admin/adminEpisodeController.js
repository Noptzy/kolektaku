const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');


exports.getEpisodes = async (req, res) => {
    try {
        const { animeDetailId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await adminService.getEpisodes(animeDetailId, page, limit);
        res.status(200).json(resHandler.success('Episodes retrieved', result));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to get episodes'));
    }
};

exports.createEpisode = async (req, res) => {
    try {
        const { animeDetailId } = req.params;
        const episode = await adminService.createEpisode(req.user.id, animeDetailId, req.body);
        res.status(201).json(resHandler.success('Episode created', episode));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create episode'));
    }
};

exports.updateEpisode = async (req, res) => {
    try {
        const episode = await adminService.updateEpisode(req.user.id, req.params.episodeId, req.body);
        res.status(200).json(resHandler.success('Episode updated', episode));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to update episode'));
    }
};

exports.deleteEpisode = async (req, res) => {
    try {
        await adminService.deleteEpisode(req.user.id, req.params.episodeId);
        res.status(200).json(resHandler.success('Episode deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to delete episode'));
    }
};

exports.deleteAllEpisodes = async (req, res) => {
    try {
        const { animeDetailId } = req.params;
        await adminService.deleteAllEpisodes(req.user.id, animeDetailId);
        res.status(200).json(resHandler.success('All episodes deleted successfully'));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to delete all episodes'));
    }
};


exports.getSources = async (req, res) => {
    try {
        const sources = await adminService.getEpisodeSources(req.params.episodeId);
        res.status(200).json(resHandler.success('Sources retrieved', sources));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to get sources'));
    }
};

exports.createSource = async (req, res) => {
    try {
        const source = await adminService.createEpisodeSource(req.user.id, req.params.episodeId, req.body);
        res.status(201).json(resHandler.success('Source created', source));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create source'));
    }
};

exports.updateSource = async (req, res) => {
    try {
        const source = await adminService.updateEpisodeSource(req.user.id, req.params.sourceId, req.body);
        res.status(200).json(resHandler.success('Source updated', source));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to update source'));
    }
};

exports.deleteSource = async (req, res) => {
    try {
        await adminService.deleteEpisodeSource(req.user.id, req.params.sourceId);
        res.status(200).json(resHandler.success('Source deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to delete source'));
    }
};
