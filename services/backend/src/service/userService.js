const userRepository = require('../repository/userRepository');
const auditLogRepository = require('../repository/auditLogRepository');
const emailService = require('./emailService');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

class UserService {
    _calculateExpiredAt(durationDays) {
        if (!durationDays) return null;
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + durationDays);
        return expiredAt;
    }

    async getAllUsers(page = 1, limit = 20, search = null) {
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            userRepository.findAllUsers({ skip, take: limit, search }),
            userRepository.countUsers({ search }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            data: users,
            total,
            page,
            limit,
            totalPages,
        };
    }

    async getUserById(id) {
        const user = await userRepository.findUserById(id);
        if (!user) return null;

        const { password: _, ...safe } = user;
        return safe;
    }

    async getUserByEmail(email) {
        return userRepository.findUserByEmail(email);
    }

    async createUser(data) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        return userRepository.storeUser({ ...data, password: hashedPassword });
    }

    async updateUser(adminId, userId, data) {
        const { password, roleId, ...safeData } = data;

        const user = await userRepository.updateUser(userId, safeData);

        await auditLogRepository.createLog({
            adminId,
            action: 'UPDATE_USER',
            entityType: 'User',
            entityId: userId,
            changes: safeData,
        });

        return user;
    }

    async updateUserRole(adminId, userId, roleId) {
        const existingUser = await userRepository.findUserById(userId);
        if (!existingUser) throw { status: 404, message: 'User not found' };

        const normalizedRoleId = Number(roleId);
        if (!Number.isInteger(normalizedRoleId)) {
            throw { status: 400, message: 'roleId must be an integer' };
        }

        const user = await userRepository.updateUser(userId, { roleId: normalizedRoleId });

        await auditLogRepository.createLog({
            adminId,
            action: 'UPDATE_USER_ROLE',
            entityType: 'User',
            entityId: userId,
            changes: { roleId: normalizedRoleId },
        });

        if (existingUser.email && existingUser.roleId !== normalizedRoleId) {
            const [oldRole, newRole] = await Promise.all([
                existingUser.roleId ? prisma.role.findUnique({ where: { id: existingUser.roleId } }) : Promise.resolve(null),
                prisma.role.findUnique({ where: { id: normalizedRoleId } }),
            ]);

            await emailService.sendRoleUpgradeNotification(
                existingUser.email,
                existingUser.name || 'Member',
                newRole?.title || `Role ${normalizedRoleId}`,
                oldRole?.title || null,
                { idempotencyKey: `role-update:${userId}:${existingUser.roleId || 'none'}:${normalizedRoleId}` },
            );
        }

        return user;
    }

    async deleteUser(adminId, userId) {
        const user = await userRepository.findUserById(userId);
        if (!user) throw { status: 404, message: 'User not found' };

        await auditLogRepository.createLog({
            adminId,
            action: 'DELETE_USER',
            entityType: 'User',
            entityId: userId,
            changes: { email: user.email, name: user.name },
        });

        return userRepository.deleteUser(userId);
    }

    async assignMembership(adminId, userId, planId) {
        const user = await userRepository.findUserById(userId);
        if (!user) throw { status: 404, message: 'User not found' };

        const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
        if (!plan) throw { status: 404, message: 'Plan not found' };
        if (!plan.isActive) throw { status: 400, message: 'Plan is not active' };

        const expiredAt = this._calculateExpiredAt(plan.durationDays);
        await userRepository.assignMembership(userId, planId, plan.price, expiredAt);

        await userRepository.updateUser(userId, { roleId: 2 });

        await auditLogRepository.createLog({
            adminId,
            action: 'ASSIGN_MEMBERSHIP',
            entityType: 'User',
            entityId: userId,
            changes: { planId, planTitle: plan.title, expiredAt },
        });

        await emailService.sendMembershipNotification(
            user.email,
            user.name,
            plan.title,
            expiredAt,
            {
                source: 'admin',
                idempotencyKey: `membership:admin:${userId}:${planId}:${expiredAt ? expiredAt.toISOString() : 'lifetime'}`,
            },
        );

        return { userId, planId, planTitle: plan.title, expiredAt };
    }

    async purchaseMembership(userId, planId) {
        const user = await userRepository.findUserById(userId);
        if (!user) throw { status: 404, message: 'User not found' };

        const normalizedPlanId = Number(planId);
        if (!Number.isInteger(normalizedPlanId)) {
            throw { status: 400, message: 'planId must be an integer' };
        }

        const plan = await prisma.membershipPlan.findUnique({ where: { id: normalizedPlanId } });
        if (!plan) throw { status: 404, message: 'Plan not found' };
        if (!plan.isActive) throw { status: 400, message: 'Plan is not active' };

        const expiredAt = this._calculateExpiredAt(plan.durationDays);
        const transactionId = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

        await prisma.$transaction(async (tx) => {
            await tx.transaction.create({
                data: {
                    id: transactionId,
                    userId,
                    planId: normalizedPlanId,
                    amount: plan.price,
                    paymentMethod: 'manual',
                    status: 'success',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            await userRepository.assignMembership(userId, normalizedPlanId, plan.price, expiredAt, tx);
            await userRepository.updateUser(userId, { roleId: 2 }, tx);
        });

        await auditLogRepository.createLog({
            adminId: userId,
            action: 'PURCHASE_MEMBERSHIP',
            entityType: 'User',
            entityId: userId,
            changes: { planId: normalizedPlanId, transactionId, expiredAt },
        });

        await emailService.sendMembershipNotification(
            user.email,
            user.name || 'Member',
            plan.title,
            expiredAt,
            {
                source: 'purchase',
                idempotencyKey: `membership:purchase:${userId}:${transactionId}`,
            },
        );

        return {
            transactionId,
            planId: normalizedPlanId,
            planTitle: plan.title,
            expiredAt,
        };
    }
}

module.exports = new UserService();
