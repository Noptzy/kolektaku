const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getTopFavorited = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await animeService.getTopFavorited(limit);
        res.status(200).json(resHandler.success('Successfully fetched top favorited anime', result));
    } catch (error) {
        console.error('getTopFavorited error:', error);
        res.status(500).json(resHandler.error('Failed to fetch top favorited anime'));
    }
};

exports.getTopWatched = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await animeService.getTopWatched(limit);
        res.status(200).json(resHandler.success('Successfully fetched top watched anime', result));
    } catch (error) {
        console.error('getTopWatched error:', error);
        res.status(500).json(resHandler.error('Failed to fetch top watched anime'));
    }
};

exports.getTopEpisodes = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const result = await animeService.getTopEpisodes(limit);
        res.status(200).json(resHandler.success('Successfully fetched top episodes', result));
    } catch (error) {
        console.error('getTopEpisodes error:', error);
        res.status(500).json(resHandler.error('Failed to fetch top episodes'));
    }
};

exports.getGrowthStats = async (_req, res) => {
    try {
        const result = await animeService.getGrowthStats();
        res.status(200).json(resHandler.success('Successfully fetched growth stats', result));
    } catch (error) {
        console.error('getGrowthStats error:', error);
        res.status(500).json(resHandler.error('Failed to fetch growth stats'));
    }
};
