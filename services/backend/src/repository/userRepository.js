const prisma = require('../config/prisma');

const DEFAULT_ROLE_ID = 3;

class UserRepository {
    findUserById(id, tx = prisma) {
        return tx.user.findUnique({
            where: { id },
            include: {
                role: { select: { id: true, title: true } },
                subscription: {
                    include: { plan: { select: { id: true, title: true, durationDays: true } } },
                },
                premiumTrial: true,
            },
        });
    }

    findUserByEmail(email, tx = prisma) {
        return tx.user.findUnique({ where: { email } });
    }

    findByEmailOrOauthId(email, oauthId, tx = prisma) {
        return tx.user.findFirst({
            where: { OR: [{ email }, { oauthId }] },
        });
    }

    findAllUsers({ skip = 0, take = 20, search } = {}, tx = prisma) {
        const where = { roleId: { not: 1 } };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        return tx.user.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            where,
            select: {
                id: true,
                email: true,
                name: true,
                roleId: true,
                avatarUrl: true,
                provider: true,
                createdAt: true,
                updatedAt: true,
                role: { select: { id: true, title: true } },
                subscription: {
                    select: {
                        planId: true,
                        expiredAt: true,
                        plan: { select: { title: true } },
                    },
                },
                premiumTrial: { select: { expiresAt: true, isUsed: true } },
            },
        });
    }

    countUsers({ search } = {}, tx = prisma) {
        const where = { roleId: { not: 1 } };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        return tx.user.count({ where });
    }

    async findUser({ params = {} }, tx = prisma) {
        const user = await tx.user.findMany({
            take: 10,
            where: {
                name: {
                    startsWith: params.name || undefined,
                    mode: 'insensitive',
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return user;
    }

    async storeUser(data, tx = prisma) {
        const now = new Date();
        const user = await tx.user.create({
            data: {
                email: data.email,
                name: data.name,
                roleId: DEFAULT_ROLE_ID,
                password: data.password,
                provider: 'local',
                createdAt: now,
                updatedAt: now,
            },
        });
        return user;
    }

    async storeGoogleUser({ email, name, oauthId, avatarUrl }, tx = prisma) {
        const now = new Date();
        return tx.user.create({
            data: {
                email,
                name,
                oauthId,
                avatarUrl,
                provider: 'google',
                roleId: DEFAULT_ROLE_ID,
                createdAt: now,
                updatedAt: now,
            },
        });
    }

    updateUser(id, data, tx = prisma) {
        return tx.user.update({
            where: { id },
            data: { ...data, updatedAt: new Date() },
        });
    }

    deleteUser(id, tx = prisma) {
        return tx.user.delete({ where: { id } });
    }

    linkGoogle(id, oauthId, avatarUrl, tx = prisma) {
        return tx.user.update({
            where: { id },
            data: { oauthId, avatarUrl, provider: 'google', updatedAt: new Date() },
        });
    }

    assignMembership(userId, planId, price, expiredAt, tx = prisma) {
        return tx.userSubscription.upsert({
            where: { userId },
            update: {
                planId,
                price,
                expiredAt,
                updatedAt: new Date(),
            },
            create: {
                userId,
                planId,
                price,
                expiredAt,
                updatedAt: new Date(),
            },
        });
    }
}

module.exports = new UserRepository();
