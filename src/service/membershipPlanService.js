const membershipPlanRepository = require('../repository/membershipPlanRepository');
const auditLogRepository = require('../repository/auditLogRepository');

class MembershipPlanService {
    async getAll(page = 1, limit = 20, includeInactive = false) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            membershipPlanRepository.findAll({ skip, take: limit, includeInactive }),
            membershipPlanRepository.count({ includeInactive }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getById(id) {
        return membershipPlanRepository.findById(id);
    }

    async create(adminId, data) {
        const plan = await membershipPlanRepository.create(data);
        await auditLogRepository.createLog({
            adminId,
            action: 'CREATE_MEMBERSHIP_PLAN',
            entityType: 'MembershipPlan',
            entityId: plan.id,
            changes: data,
        });
        return plan;
    }

    async update(adminId, id, data) {
        const plan = await membershipPlanRepository.update(id, data);
        await auditLogRepository.createLog({
            adminId,
            action: 'UPDATE_MEMBERSHIP_PLAN',
            entityType: 'MembershipPlan',
            entityId: id,
            changes: data,
        });
        return plan;
    }

    async delete(adminId, id) {
        await auditLogRepository.createLog({
            adminId,
            action: 'DELETE_MEMBERSHIP_PLAN',
            entityType: 'MembershipPlan',
            entityId: id,
            changes: null,
        });
        return membershipPlanRepository.delete(id);
    }
}

module.exports = new MembershipPlanService();
