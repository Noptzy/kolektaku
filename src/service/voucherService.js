const voucherRepository = require('../repository/voucherRepository');
const auditLogRepository = require('../repository/auditLogRepository');

class VoucherService {
    async getAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            voucherRepository.findAll({ skip, take: limit }),
            voucherRepository.count(),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    async getById(id) {
        return voucherRepository.findById(id);
    }

    async getActive() {
        return voucherRepository.findActive();
    }

    async create(adminId, data) {
        const voucher = await voucherRepository.create(data);
        await auditLogRepository.createLog({
            adminId,
            action: 'CREATE_VOUCHER',
            entityType: 'VoucherCode',
            entityId: voucher.id,
            changes: { code: voucher.code, discountPercent: data.discountPercent },
        });
        return voucher;
    }

    async update(adminId, id, data) {
        const voucher = await voucherRepository.update(id, data);
        await auditLogRepository.createLog({
            adminId,
            action: 'UPDATE_VOUCHER',
            entityType: 'VoucherCode',
            entityId: id,
            changes: data,
        });
        return voucher;
    }

    async delete(adminId, id) {
        await auditLogRepository.createLog({
            adminId,
            action: 'DELETE_VOUCHER',
            entityType: 'VoucherCode',
            entityId: id,
            changes: null,
        });
        return voucherRepository.delete(id);
    }

    async validate(code, userId) {
        const voucher = await voucherRepository.findByCode(code);
        if (!voucher) throw { status: 404, message: 'Voucher not found' };
        if (!voucher.isActive) throw { status: 400, message: 'Voucher is not active' };
        if (voucher.usedCount >= voucher.maxUses) throw { status: 400, message: 'Voucher has reached max uses' };
        if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) throw { status: 400, message: 'Voucher has expired' };

        return {
            id: voucher.id,
            code: voucher.code,
            discountPercent: voucher.discountPercent,
            plan: voucher.plan,
            valid: true,
        };
    }

    async useVoucher(code, userId, planId = null) {
        const voucher = await this.validate(code, userId);

        // Record usage and increment count
        await voucherRepository.createUsage({ voucherId: voucher.id, userId, planId });
        await voucherRepository.incrementUsage(voucher.id);

        return voucher;
    }

    async getUsages(voucherId) {
        return voucherRepository.findUsagesByVoucher(voucherId);
    }
}

module.exports = new VoucherService();
