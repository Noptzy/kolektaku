const animeService = require('../../service/animeService');
const resHandler = require('../../utils/resHandler');

exports.getStaffAnime = async (req, res) => {
    try {
        const { staffId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || 'newest';

        const result = await animeService.getStaffAnime(staffId, page, limit, sort);
        res.status(200).json(resHandler.success('Successfully fetched anime by staff', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch anime by staff'));
    }
};
