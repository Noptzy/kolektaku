const prisma = require('../config/prisma');

class AuditLogRepository {
    createLog({ adminId, action, entityType, entityId, changes }, tx = prisma) {
        return tx.adminAuditLog.create({
            data: {
                adminId,
                action,
                entityType,
                entityId: String(entityId),
                changes: changes || null,
                createdAt: new Date(),
            },
        });
    }

    async findLogs({ skip = 0, take = 20, adminId, entityType } = {}, tx = prisma) {
        const where = {};
        if (adminId) where.adminId = adminId;
        if (entityType) where.entityType = entityType;

        return tx.adminAuditLog.findMany({
            skip,
            take,
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                admin: {
                    select: { id: true, name: true, email: true, avatarUrl: true },
                },
            },
        });
    }

    async countLogs({ adminId, entityType } = {}, tx = prisma) {
        const where = {};
        if (adminId) where.adminId = adminId;
        if (entityType) where.entityType = entityType;

        return tx.adminAuditLog.count({ where });
    }
}

module.exports = new AuditLogRepository();
