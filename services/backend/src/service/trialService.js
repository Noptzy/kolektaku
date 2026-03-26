const trialRepository = require('../repository/trialRepository');
const prisma = require('../config/prisma');
const emailService = require('./emailService');

class TrialService {
    async activate(userId) {
        const existing = await trialRepository.findByUserId(userId);
        if (existing) throw { status: 400, message: 'Trial already used' };

        const subscription = await prisma.userSubscription.findUnique({ where: { userId } });
        if (subscription) throw { status: 400, message: 'User already has active subscription' };

        const trial = await trialRepository.create(userId);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { roleId: 2, updatedAt: new Date() },
        });

        emailService.sendMembershipNotification(
            updatedUser.email,
            updatedUser.name || 'Member',
            'Premium Trial 7 Hari',
            trial.expiresAt,
            {
                source: 'trial',
                idempotencyKey: `membership:trial:${userId}:${trial.id}`,
            }
        ).catch(err => console.error('Failed to send trial email:', err));

        return trial;
    }

    async getStatus(userId) {
        const trial = await trialRepository.findByUserId(userId);
        if (!trial) return { hasTrial: false, eligible: true };

        const isExpired = new Date(trial.expiresAt) < new Date();
        return {
            hasTrial: true,
            eligible: false,
            isExpired,
            startedAt: trial.startedAt,
            expiresAt: trial.expiresAt,
        };
    }

    async getAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            trialRepository.findAll({ skip, take: limit }),
            trialRepository.count(),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}

module.exports = new TrialService();
