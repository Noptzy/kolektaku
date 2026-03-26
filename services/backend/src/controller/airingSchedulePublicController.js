const service = require('../service/airingScheduleService');
const resHandler = require('../utils/resHandler');

class AiringSchedulePublicController {
    async getWeekly(req, res) {
        try {
            const now = new Date();
            const startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 30);

            const schedules = await service.getSchedulesInRange(startDate, endDate);
            
            const grouped = {};

            schedules.forEach(s => {
                const gmt7Date = new Date(s.airingAt);
                gmt7Date.setHours(gmt7Date.getHours() + 7);
                const dateKey = gmt7Date.toISOString().split('T')[0];
                
                if (!grouped[dateKey]) {
                    grouped[dateKey] = [];
                }
                grouped[dateKey].push(s);
            });

            return res.status(200).json(resHandler.success('Successfully fetched 30-day schedule', grouped));   
        } catch (error) {
            return res.status(500).json(resHandler.error(error.message));
        }
    }
}

module.exports = new AiringSchedulePublicController();
