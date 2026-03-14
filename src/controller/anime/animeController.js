const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getAllAnime = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const filters = {};
        if (req.query.type) filters.type = req.query.type;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.contentRating) filters.contentRating = req.query.contentRating;
        if (req.query.year) filters.year = req.query.year;
        if (req.query.yearFrom) filters.yearFrom = req.query.yearFrom;
        if (req.query.yearTo) filters.yearTo = req.query.yearTo;
        if (req.query.genre) filters.genre = req.query.genre;
        if (req.query.sort) filters.sort = req.query.sort;
        if (req.query.q) filters.q = req.query.q;

        const result = await animeService.getAllAnime(page, limit, filters);
        res.status(200).json(resHandler.success('Successfully fetched anime', result));
    } catch (error) {
        console.error('getAllAnime error:', error);
        res.status(500).json(resHandler.error('Failed to fetch anime list'));
    }
};

exports.getFilterOptions = async (_req, res) => {
    try {
        const result = await animeService.getFilterOptions();
        res.status(200).json(resHandler.success('Successfully fetched filter options', result));
    } catch (error) {
        console.error('getFilterOptions error:', error);
        res.status(500).json(resHandler.error('Failed to fetch filter options'));
    }
};

exports.getAnimeBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await animeService.getAnimeBySlug(slug);

        if (!result) {
            return res.status(404).json(resHandler.error('Anime not found', 404));
        }

        res.status(200).json(resHandler.success('Successfully fetched anime details', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch anime details'));
    }
};

exports.getEpisodeList = async (req, res) => {
    try {
        const { slug } = req.params;
        const episodes = await animeService.getEpisodeList(slug);

        if (!episodes) {
            return res.status(404).json(resHandler.error('Anime not found'));
        }

        res.status(200).json(resHandler.success('Successfully fetched episode list', episodes));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch episode list'));
    }
};

exports.getEpisodeStream = async (req, res) => {
    try {
        const { slug, episodeNumber } = req.params;
        const result = await animeService.getEpisodeStream(slug, parseFloat(episodeNumber));

        if (!result) {
            return res.status(404).json(resHandler.error('Episode not found'));
        }

        res.status(200).json(resHandler.success('Successfully fetched episode stream', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch episode stream'));
    }
};

exports.searchAnime = async (req, res) => {
    try {
        const keyword = req.query.q;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const filters = {};
        if (req.query.type) filters.type = req.query.type;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.contentRating) filters.contentRating = req.query.contentRating;
        if (req.query.year) filters.year = req.query.year;
        if (req.query.yearFrom) filters.yearFrom = req.query.yearFrom;
        if (req.query.yearTo) filters.yearTo = req.query.yearTo;
        if (req.query.genre) filters.genre = req.query.genre;
        if (req.query.sort) filters.sort = req.query.sort;

        const result = await animeService.searchAnime(keyword, page, limit, filters);
        res.status(200).json(resHandler.success('Successfully searched anime', result));
    } catch (error) {
        console.error('SEARCH ANIME ERROR:', error);
        res.status(500).json(resHandler.error('Failed to search anime'));
    }
};

exports.getGlobalStats = async (req, res) => {
    try {
        const result = await animeService.getGlobalStats();
        res.status(200).json(resHandler.success('Successfully fetched global statistics', result));
    } catch (error) {
        console.error('getGlobalStats error:', error);
        res.status(500).json(resHandler.error('Failed to fetch global statistics'));
    }
};
