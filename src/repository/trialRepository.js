const prisma = require('../config/prisma');

class TrialRepository {
    findByUserId(userId, tx = prisma) {
        return tx.premiumTrial.findUnique({ where: { userId } });
    }

    create(userId, tx = prisma) {
        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return tx.premiumTrial.create({
            data: {
                userId,
                startedAt: now,
                expiresAt,
                isUsed: true,
                createdAt: now,
            },
        });
    }

    findAll({ skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.premiumTrial.findMany({
            skip,
            take,
            orderBy: { startedAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    }

    count(tx = prisma) {
        return tx.premiumTrial.count();
    }
}

module.exports = new TrialRepository();
