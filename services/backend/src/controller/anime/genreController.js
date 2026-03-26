const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getAnimeByGenre = async (req, res) => {
    const { genre } = req.params;
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await animeService.getAnimeByGenre(genre, page, limit);
        res.status(200).json(resHandler.success(`Successfully fetched anime for genre: ${genre}`, result));
    } catch (error) {
        res.status(500).json(resHandler.error(`Failed to fetch anime for genre: ${genre}`));
    }
};
