const prisma = require('../config/prisma');

const DEFAULT_ROLE_ID = 3;

class UserRepository {
    findUserById(id, tx = prisma) {
        return tx.user.findUnique({ where: { id } });
    }

    findUserByEmail(email, tx = prisma) {
        return tx.user.findUnique({ where: { email } });
    }

    findByEmailOrOauthId(email, oauthId, tx = prisma) {
        return tx.user.findFirst({
            where: { OR: [{ email }, { oauthId }] },
        });
    }

    findAllUsers({ skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.user.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            where: { roleId: { not: 1 } }, // Exclude Super Admin
            select: {
                email: true,
                name: true,
                roleId: true,
                avatarUrl: true,
            },
        });
    }

    countUsers(tx = prisma) {
        return tx.user.count({
            where: { roleId: { not: 1 } },
        });
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
}

module.exports = new UserRepository();
