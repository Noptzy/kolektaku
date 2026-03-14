const userRepository = require('../repository/userRepository');
const auditLogRepository = require('../repository/auditLogRepository');
const emailService = require('./emailService');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

class UserService {
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
        // Don't allow password update through this method
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
        const user = await userRepository.updateUser(userId, { roleId });

        await auditLogRepository.createLog({
            adminId,
            action: 'UPDATE_USER_ROLE',
            entityType: 'User',
            entityId: userId,
            changes: { roleId },
        });

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
        // Fetch user and plan
        const user = await userRepository.findUserById(userId);
        if (!user) throw { status: 404, message: 'User not found' };

        const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
        if (!plan) throw { status: 404, message: 'Plan not found' };
        if (!plan.isActive) throw { status: 400, message: 'Plan is not active' };

        // Calculate expiry
        let expiredAt = null;
        if (plan.durationDays) {
            expiredAt = new Date();
            expiredAt.setDate(expiredAt.getDate() + plan.durationDays);
        }

        // Upsert subscription
        await userRepository.assignMembership(userId, planId, plan.price, expiredAt);

        // Update role to premium (roleId: 2)
        await userRepository.updateUser(userId, { roleId: 2 });

        // Log audit
        await auditLogRepository.createLog({
            adminId,
            action: 'ASSIGN_MEMBERSHIP',
            entityType: 'User',
            entityId: userId,
            changes: { planId, planTitle: plan.title, expiredAt },
        });

        // Send email notification
        await emailService.sendMembershipNotification(
            user.email,
            user.name,
            plan.title,
            expiredAt
        );

        return { userId, planId, planTitle: plan.title, expiredAt };
    }
}

module.exports = new UserService();
