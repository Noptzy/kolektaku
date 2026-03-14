const searchService = require('../../service/searchService');
const resHandler = require('../../utils/resHandler');

exports.searchAll = async (req, res) => {
    try {
        const query = req.query.q || '';
        const take = parseInt(req.query.limit) || 5;

        const results = await searchService.searchAll(query, take);
        res.status(200).json(resHandler.success('Successfully fetched search results', results));
    } catch (error) {
        console.error('searchAll error:', error);
        res.status(500).json(resHandler.error('Failed to fetch search results'));
    }
};
