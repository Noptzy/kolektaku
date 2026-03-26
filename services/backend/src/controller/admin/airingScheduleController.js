const service = require('../../service/airingScheduleService');
const resHandler = require('../../utils/resHandler');

class AiringScheduleController {
    async triggerFetch(req, res) {
        try {
            const { date, range } = req.body || {};
            const adminId = req.user.id;

            let result;
            if (range) {
                result = await service.triggerFetchRange(adminId, parseInt(range));
            } else {
                result = await service.triggerFetchSchedules(date, adminId);
            }
            
            return res.status(200).json(resHandler.success(result.message, result));
        } catch (error) {
            return res.status(500).json(resHandler.error(error.message));
        }
    }
}

module.exports = new AiringScheduleController();
