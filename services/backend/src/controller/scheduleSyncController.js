const service = require('../service/scheduleSyncService');
const resHandler = require('../utils/resHandler');

class ScheduleSyncController {
    async sync(req, res) {
        try {
            const { date, days } = req.query;
            
            if (date) {
                const result = await service.syncSchedule(date);
                return res.status(200).json(resHandler.success('Schedule sync completed for ' + date, result).toJSON());
            }

            const rangeResult = await service.syncRange(days ? parseInt(days) : 7);
            return res.status(200).json(resHandler.success('Batch schedule sync completed', rangeResult).toJSON());

        } catch (error) {
            return res.status(500).json(resHandler.error(error.message).toJSON());
        }
    }
}

module.exports = new ScheduleSyncController();
