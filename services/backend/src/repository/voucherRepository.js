const prisma = require('../config/prisma');

class VoucherRepository {
    findAll({ skip = 0, take = 20 } = {}, tx = prisma) {
        return tx.voucherCode.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                plan: { select: { id: true, title: true } },
                _count: { select: { usages: true } },
            },
        });
    }

    count(tx = prisma) {
        return tx.voucherCode.count();
    }

    findById(id, tx = prisma) {
        return tx.voucherCode.findUnique({
            where: { id },
            include: {
                plan: { select: { id: true, title: true } },
                usages: {
                    orderBy: { usedAt: 'desc' },
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                        plan: { select: { id: true, title: true } },
                    },
                },
            },
        });
    }

    findByCode(code, tx = prisma) {
        return tx.voucherCode.findUnique({
            where: { code },
            include: { plan: { select: { id: true, title: true } } },
        });
    }

    findActive(tx = prisma) {
        return tx.voucherCode.findMany({
            where: {
                isActive: true,
                usedCount: { lt: prisma.voucherCode.fields.maxUses },
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            include: { plan: { select: { id: true, title: true } } }
        });
    }

    create(data, tx = prisma) {
        return tx.voucherCode.create({
            data: {
                code: data.code.toUpperCase(),
                discountPercent: data.discountPercent,
                maxUses: data.maxUses || 1,
                planId: data.planId || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                createdAt: new Date(),
            },
        });
    }

    update(id, data, tx = prisma) {
        const updateData = {};
        if (data.code !== undefined) updateData.code = data.code.toUpperCase();
        if (data.discountPercent !== undefined) updateData.discountPercent = data.discountPercent;
        if (data.maxUses !== undefined) updateData.maxUses = data.maxUses;
        if (data.planId !== undefined) updateData.planId = data.planId;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;
        if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

        return tx.voucherCode.update({ where: { id }, data: updateData });
    }

    delete(id, tx = prisma) {
        return tx.voucherCode.delete({ where: { id } });
    }

    incrementUsage(id, tx = prisma) {
        return tx.voucherCode.update({
            where: { id },
            data: { usedCount: { increment: 1 } },
        });
    }

    createUsage({ voucherId, userId, planId }, tx = prisma) {
        return tx.voucherUsage.create({
            data: { voucherId, userId, planId, usedAt: new Date() },
        });
    }

    findUsagesByVoucher(voucherId, tx = prisma) {
        return tx.voucherUsage.findMany({
            where: { voucherId },
            orderBy: { usedAt: 'desc' },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
            },
        });
    }
}

module.exports = new VoucherRepository();
