const adminService = require('../../service/adminService');
const resHandler = require('../../utils/resHandler');

exports.getBroadcasts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20;
        const result = await adminService.getBroadcasts(page, limit);
        return res.status(200).json(resHandler.success('Broadcasts retrieved', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to get broadcasts'));
    }
};

exports.createBroadcast = async (req, res) => {
    try {
        const result = await adminService.createBroadcast(req.user.id, req.body || {});
        return res.status(201).json(resHandler.success('Broadcast created', result));
    } catch (error) {
        return res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to create broadcast'));
    }
};
