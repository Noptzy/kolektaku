const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getVAanime = async (req, res) => {
    try {
        const { vaId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || 'newest';

        const result = await animeService.getVAanime(vaId, page, limit, sort);
        res.status(200).json(resHandler.success('Successfully fetched anime by voice actor', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch anime by voice actor'));
    }
};
