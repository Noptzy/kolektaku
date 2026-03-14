const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || null;
        const result = await adminService.getAllCharacters(page, limit, search);
        res.status(200).json(resHandler.success('Characters fetched', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch characters'));
    }
};

exports.getById = async (req, res) => {
    try {
        const character = await adminService.getCharacterById(req.params.id);
        if (!character) return res.status(404).json(resHandler.error('Character not found'));
        res.status(200).json(resHandler.success('Character fetched', character));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch character'));
    }
};

exports.create = async (req, res) => {
    try {
        const { name, imageUrl } = req.body;
        if (!name) return res.status(400).json(resHandler.error('Name is required'));
        const character = await adminService.createCharacter(req.user.id, { name, imageUrl });
        res.status(201).json(resHandler.success('Character created', character));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create character'));
    }
};

exports.update = async (req, res) => {
    try {
        const character = await adminService.updateCharacter(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('Character updated', character));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to update character'));
    }
};

exports.delete = async (req, res) => {
    try {
        await adminService.deleteCharacter(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Character deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to delete character'));
    }
};
