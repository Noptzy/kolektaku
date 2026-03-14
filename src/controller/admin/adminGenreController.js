const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const result = await adminService.getAllGenres(page, limit);
        res.status(200).json(resHandler.success('Genres fetched', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch genres'));
    }
};

exports.getById = async (req, res) => {
    try {
        const genre = await adminService.getGenreById(req.params.id);
        if (!genre) return res.status(404).json(resHandler.error('Genre not found'));
        res.status(200).json(resHandler.success('Genre fetched', genre));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch genre'));
    }
};

exports.create = async (req, res) => {
    try {
        const { name, isNsfw } = req.body;
        if (!name) return res.status(400).json(resHandler.error('Name is required'));
        const genre = await adminService.createGenre(req.user.id, { name, isNsfw });
        res.status(201).json(resHandler.success('Genre created', genre));
    } catch (error) {
        res.status(500).json(resHandler.error(error.message || 'Failed to create genre'));
    }
};

exports.update = async (req, res) => {
    try {
        const genre = await adminService.updateGenre(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('Genre updated', genre));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to update genre'));
    }
};

exports.delete = async (req, res) => {
    try {
        await adminService.deleteGenre(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Genre deleted'));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to delete genre'));
    }
};
