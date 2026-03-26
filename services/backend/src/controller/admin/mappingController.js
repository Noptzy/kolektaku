const mappingService = require('../../service/mappingService');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status || 'pending';
        const query = req.query.search || '';
        const result = await mappingService.getAllPending(page, limit, status, query);
        res.status(200).json(resHandler.success('Mappings fetched', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch mappings'));
    }
};

exports.getById = async (req, res) => {
    try {
        const mapping = await mappingService.getById(req.params.id);
        if (!mapping) return res.status(404).json(resHandler.error('Mapping not found'));
        res.status(200).json(resHandler.success('Mapping fetched', mapping));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch mapping'));
    }
};

exports.approve = async (req, res) => {
    try {
        const { candidateId } = req.body;
        if (!candidateId) return res.status(400).json(resHandler.error('candidateId is required'));

        const result = await mappingService.approve(req.user.id, req.params.id, candidateId);
        res.status(200).json(resHandler.success('Mapping approved', result));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to approve'));
    }
};

exports.ignore = async (req, res) => {
    try {
        const result = await mappingService.ignore(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Mapping ignored', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to ignore mapping'));
    }
};

exports.bulkApprove = async (req, res) => {
    try {
        const { items } = req.body; // [{ mappingId, candidateId }]
        if (!items || !Array.isArray(items)) return res.status(400).json(resHandler.error('items array is required'));

        const result = await mappingService.bulkApprove(req.user.id, items);
        res.status(200).json(resHandler.success('Bulk approval processed', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to process bulk approval'));
    }
};

exports.bulkIgnore = async (req, res) => {
    try {
        const { mappingIds } = req.body;
        if (!mappingIds || !Array.isArray(mappingIds)) return res.status(400).json(resHandler.error('mappingIds array is required'));

        const result = await mappingService.bulkIgnore(req.user.id, mappingIds);
        res.status(200).json(resHandler.success('Bulk ignore successful', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to process bulk ignore'));
    }
};

exports.manualConnect = async (req, res) => {
    try {
        const { koleksiId } = req.body;
        if (!koleksiId) return res.status(400).json(resHandler.error('koleksiId is required'));

        const result = await mappingService.manualConnect(req.user.id, req.params.id, koleksiId);
        res.status(200).json(resHandler.success('Mapping connected manually', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to connect mapping'));
    }
};

exports.connectAnime = async (req, res) => {
    try {
        const result = await mappingService.connectAnime(req.user.id, req.params.koleksiId, req.body);
        res.status(200).json(resHandler.success('Anime connected', result));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to connect anime'));
    }
};

exports.disconnectAnime = async (req, res) => {
    try {
        const result = await mappingService.disconnectAnime(req.user.id, req.params.koleksiId);
        res.status(200).json(resHandler.success('Anime disconnected', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to disconnect anime'));
    }
};
