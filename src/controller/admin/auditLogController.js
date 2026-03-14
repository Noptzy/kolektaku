const auditLogRepository = require('../../repository/auditLogRepository');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const adminId = req.query.adminId || null;
        const entityType = req.query.entityType || null;

        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            auditLogRepository.findLogs({ skip, take: limit, adminId, entityType }),
            auditLogRepository.countLogs({ adminId, entityType }),
        ]);

        const totalPages = Math.ceil(total / limit);
        res.status(200).json(resHandler.success('Audit logs fetched', { data, total, page, limit, totalPages }));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch audit logs'));
    }
};
