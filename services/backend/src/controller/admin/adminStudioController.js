const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || null;
        const result = await adminService.getAllStudios(page, limit, search);
        res.status(200).json(resHandler.success('Studios fetched', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch studios'));
    }
};

exports.getById = async (req, res) => {
    try {
        const studio = await adminService.getStudioById(req.params.id);
        if (!studio) return res.status(404).json(resHandler.error('Studio not found'));
        res.status(200).json(resHandler.success('Studio fetched', studio));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch studio'));
    }
};

exports.create = async (req, res) => {
    try {
        const { name, anilistId, isAnimationStudio, description } = req.body;
        if (!name || !anilistId) return res.status(400).json(resHandler.error('Name and anilistId are required'));
        const studio = await adminService.createStudio(req.user.id, { name, anilistId, isAnimationStudio, description });
        res.status(201).json(resHandler.success('Studio created', studio));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create studio'));
    }
};

exports.update = async (req, res) => {
    try {
        const studio = await adminService.updateStudio(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('Studio updated', studio));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to update studio'));
    }
};

exports.delete = async (req, res) => {
    try {
        await adminService.deleteStudio(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Studio deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to delete studio'));
    }
};
