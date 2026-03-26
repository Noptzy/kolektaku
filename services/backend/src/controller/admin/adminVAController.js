const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || null;
        const result = await adminService.getAllVAs(page, limit, search);
        res.status(200).json(resHandler.success('Voice actors fetched', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch voice actors'));
    }
};

exports.getById = async (req, res) => {
    try {
        const va = await adminService.getVAById(req.params.id);
        if (!va) return res.status(404).json(resHandler.error('Voice actor not found'));
        res.status(200).json(resHandler.success('Voice actor fetched', va));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch voice actor'));
    }
};

exports.create = async (req, res) => {
    try {
        const { name, anilistId, imageUrl } = req.body;
        if (!name || !anilistId) return res.status(400).json(resHandler.error('Name and anilistId are required'));
        const va = await adminService.createVA(req.user.id, { name, anilistId, imageUrl });
        res.status(201).json(resHandler.success('Voice actor created', va));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create voice actor'));
    }
};

exports.update = async (req, res) => {
    try {
        const va = await adminService.updateVA(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('Voice actor updated', va));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to update voice actor'));
    }
};

exports.delete = async (req, res) => {
    try {
        await adminService.deleteVA(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Voice actor deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to delete voice actor'));
    }
};
