const prisma = require('../config/prisma');

class KeyRepository {
    findByUserId(userId, tx = prisma) {
        return tx.userKey.findUnique({ where: { userId } });
    }

    upsertKeys(userId, balanceChange, tx = prisma) {
        return tx.userKey.upsert({
            where: { userId },
            update: {
                balance: { increment: balanceChange },
                updatedAt: new Date(),
            },
            create: {
                userId,
                balance: Math.max(0, balanceChange),
                updatedAt: new Date(),
            },
        });
    }

    async consumeKey(userId, tx = prisma) {
        const userKey = await this.findByUserId(userId, tx);
        if (!userKey || userKey.balance <= 0) {
            throw { status: 400, message: 'Insufficient keys' };
        }

        return tx.userKey.update({
            where: { userId },
            data: {
                balance: { decrement: 1 },
                updatedAt: new Date(),
            },
        });
    }
}

module.exports = new KeyRepository();
