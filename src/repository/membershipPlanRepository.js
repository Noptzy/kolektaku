const prisma = require('../config/prisma');

class MembershipPlanRepository {
    findAll({ skip = 0, take = 20, includeInactive = false } = {}, tx = prisma) {
        const where = includeInactive ? {} : { isActive: true };
        return tx.membershipPlan.findMany({
            skip,
            take,
            where,
            orderBy: { id: 'asc' },
        });
    }

    count({ includeInactive = false } = {}, tx = prisma) {
        const where = includeInactive ? {} : { isActive: true };
        return tx.membershipPlan.count({ where });
    }

    findById(id, tx = prisma) {
        return tx.membershipPlan.findUnique({ where: { id } });
    }

    create(data, tx = prisma) {
        const now = new Date();
        return tx.membershipPlan.create({
            data: {
                title: data.title,
                desc: data.desc || null,
                price: data.price ? BigInt(data.price) : null,
                durationDays: data.durationDays || null,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdAt: now,
                updatedAt: now,
            },
        });
    }

    update(id, data, tx = prisma) {
        const updateData = { updatedAt: new Date() };
        if (data.title !== undefined) updateData.title = data.title;
        if (data.desc !== undefined) updateData.desc = data.desc;
        if (data.price !== undefined) updateData.price = BigInt(data.price);
        if (data.durationDays !== undefined) updateData.durationDays = data.durationDays;
        if (data.isActive !== undefined) updateData.isActive = data.isActive;

        return tx.membershipPlan.update({ where: { id }, data: updateData });
    }

    delete(id, tx = prisma) {
        return tx.membershipPlan.delete({ where: { id } });
    }
}

module.exports = new MembershipPlanRepository();
