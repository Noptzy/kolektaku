const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getStudioAnime = async (req, res) => {
    try {
        const { studioId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || 'newest';

        const result = await animeService.getStudioAnime(studioId, page, limit, sort);
        res.status(200).json(resHandler.success('Successfully fetched anime by studio', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch anime by studio'));
    }
};
