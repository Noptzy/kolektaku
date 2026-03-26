const repository = require('../repository/airingScheduleRepository');
const rabbitmq = require('../queues/rabbitmq');
const logger = require('../utils/logger');
const scheduleSyncService = require('./scheduleSyncService');

class AiringScheduleService {
    constructor() {
        this.lastDailySync = null;
    }
    async getPendingSchedules() {
        const nowUtc = new Date();
        return await repository.findPendingSchedules(nowUtc);
    }

    async getSchedulesInRange(startDate, endDate) {
        return await repository.getWeeklySchedules(startDate, endDate);
    }

    async processPendingSchedules() {
        try {
            const nowUtc = new Date();
            
            const todayStr = nowUtc.toISOString().split('T')[0];
            if (this.lastDailySync !== todayStr) {
                logger.info("Executing daily bulk schedule sync via ScheduleSyncService...");
                await scheduleSyncService.syncRange(30);
                this.lastDailySync = todayStr;
            }

            const startOfRange = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);
            
            const pending = await repository.findPendingSchedulesInRange(startOfRange, nowUtc);
            
            if (pending.length === 0) return;

            logger.info(`Found ${pending.length} pending schedules to scrape (today-focused).`);

            for (const item of pending) {
                const payload = {
                    action: 'schedule_scrape',
                    scheduleId: item.id,
                    koleksiId: item.koleksiId,
                    title: item.koleksi.title,
                    expectedEpisode: item.episodeNumber
                };

                await rabbitmq.publishMessage('scraping_tasks', payload, {
                    shard: false,
                });
            }
        } catch (error) {
            logger.error('Error processing pending schedules:', error.message);
        }
    }

    async triggerFetchSchedules(dateStr, adminId) {
        await rabbitmq.publishMessage('fetch_schedule', {
            date: dateStr,
            adminId: adminId
        }, {
            shardKey: dateStr || adminId,
        });
        return { message: 'Fetch schedule triggered successfully' };
    }

    async triggerFetchRange(adminId, days = 30) {
        const now = new Date();
        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            await rabbitmq.publishMessage('fetch_schedule', {
                date: dateStr,
                adminId: adminId
            }, {
                shardKey: dateStr || adminId,
            });
        }
        return { message: `Bulk fetch for ${days} days triggered sequentially.` };
    }
}

module.exports = new AiringScheduleService();
