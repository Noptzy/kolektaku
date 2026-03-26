const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getCharacterAnime = async (req, res) => {
    try {
        const { characterId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || 'newest';

        const result = await animeService.getCharacterAnime(characterId, page, limit, sort);
        res.status(200).json(resHandler.success('Successfully fetched anime by character', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch anime by character'));
    }
};
