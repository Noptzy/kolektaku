const airingScheduleService = require('../service/airingScheduleService');
const membershipReminderService = require('../service/membershipReminderService');
const logger = require('../utils/logger');


const CRON_INTERVAL_MS = 60 * 1000;
const HOURLY_INTERVAL_MS = 60 * 60 * 1000;

let intervalId = null;
let hourlyIntervalId = null;

const startScheduleCron = () => {
    if (!intervalId) {
        logger.info('Starting AiringSchedule cron job...');
        intervalId = setInterval(async () => {
            try {
                await airingScheduleService.processPendingSchedules();
            } catch (error) {
                logger.error('Error in AiringSchedule cron job:', error.message);
            }
        }, CRON_INTERVAL_MS);
    }

    if (!hourlyIntervalId) {
        logger.info('Starting Hourly cron jobs (Membership Reminders)...');
        // Initial run
        membershipReminderService.checkExpirations().catch(err => logger.error(err));
        
        hourlyIntervalId = setInterval(async () => {
            try {
                await membershipReminderService.checkExpirations();
            } catch (error) {
                logger.error('Error in Hourly cron job:', error.message);
            }
        }, HOURLY_INTERVAL_MS);
    }
};

const stopScheduleCron = () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        logger.info('AiringSchedule cron job stopped.');
    }
    if (hourlyIntervalId) {
        clearInterval(hourlyIntervalId);
        hourlyIntervalId = null;
        logger.info('Hourly cron jobs stopped.');
    }
};

module.exports = {
    startScheduleCron,
    stopScheduleCron
};
