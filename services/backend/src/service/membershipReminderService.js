const prisma = require('../config/prisma');
const redis = require('../config/redisUpstash');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class MembershipReminderService {
    async checkExpirations() {
        try {
            const now = new Date();
            const minDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
            const maxDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

            const expiringSubscriptions = await prisma.userSubscription.findMany({
                where: {
                    expiredAt: {
                        gte: minDate,
                        lte: maxDate
                    }
                },
                include: {
                    user: true
                }
            });

            for (const sub of expiringSubscriptions) {
                const userId = sub.userId;
                const redisKey = `reminder_7days_${userId}`;

                try {
                    // Check if reminder was already sent
                    const isSent = await redis.get(redisKey);
                    
                    if (!isSent && sub.user && sub.user.email) {
                        // Send Reminder
                        await emailService.sendMembershipExpiryReminder(
                            sub.user.email,
                            sub.user.name,
                            sub.expiredAt
                        );

                        // Mark as sent in Redis, expire in 30 days
                        // So next month they can receive it again
                        await redis.set(redisKey, 'true', { ex: 30 * 24 * 60 * 60 });
                        logger.info(`Sent 7-day expiry reminder to user ${userId}`);
                    }
                } catch (err) {
                    logger.error(`Failed to process reminder for user ${userId}: ${err.message}`);
                }
            }
        } catch (error) {
            logger.error('Error in checkExpirations:', error.message);
        }
    }
}

module.exports = new MembershipReminderService();
