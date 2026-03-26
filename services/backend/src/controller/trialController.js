const trialService = require('../service/trialService');
const resHandler = require('../utils/resHandler');

exports.activate = async (req, res) => {
    try {
        const trial = await trialService.activate(req.user.id);
        res.status(201).json(resHandler.success('Trial activated! Enjoy 7 days of Premium', trial));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to activate trial'));
    }
};

exports.getStatus = async (req, res) => {
    try {
        const status = await trialService.getStatus(req.user.id);
        res.status(200).json(resHandler.success('Trial status', status));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to get trial status'));
    }
};

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await trialService.getAll(page, limit);
        res.status(200).json(resHandler.success('Successfully fetched trials', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch trials'));
    }
};
