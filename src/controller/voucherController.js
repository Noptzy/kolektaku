const voucherService = require('../service/voucherService');
const resHandler = require('../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await voucherService.getAll(page, limit);
        res.status(200).json(resHandler.success('Successfully fetched vouchers', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch vouchers'));
    }
};

exports.getActive = async (req, res) => {
    try {
        const vouchers = await voucherService.getActive();
        res.status(200).json(resHandler.success('Successfully fetched active vouchers', vouchers));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch active vouchers'));
    }
};

exports.getById = async (req, res) => {
    try {
        const voucher = await voucherService.getById(req.params.id);
        if (!voucher) return res.status(404).json(resHandler.error('Voucher not found'));
        res.status(200).json(resHandler.success('Successfully fetched voucher', voucher));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch voucher'));
    }
};

exports.create = async (req, res) => {
    try {
        const { code, discountPercent, maxUses, planId, expiresAt } = req.body;
        if (!code || !discountPercent) return res.status(400).json(resHandler.error('Code and discountPercent are required'));

        const voucher = await voucherService.create(req.user.id, { code, discountPercent, maxUses, planId, expiresAt });
        res.status(201).json(resHandler.success('Voucher created successfully', voucher));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to create voucher'));
    }
};

exports.update = async (req, res) => {
    try {
        const voucher = await voucherService.update(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('Voucher updated successfully', voucher));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to update voucher'));
    }
};

exports.delete = async (req, res) => {
    try {
        await voucherService.delete(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('Voucher deleted successfully'));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to delete voucher'));
    }
};

exports.validate = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json(resHandler.error('Voucher code is required'));

        const result = await voucherService.validate(code, req.user?.id);
        res.status(200).json(resHandler.success('Voucher is valid', result));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to validate voucher'));
    }
};

exports.getUsages = async (req, res) => {
    try {
        const usages = await voucherService.getUsages(req.params.id);
        res.status(200).json(resHandler.success('Successfully fetched voucher usages', usages));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch voucher usages'));
    }
};
