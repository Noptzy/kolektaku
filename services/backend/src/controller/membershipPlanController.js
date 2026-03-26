const membershipPlanService = require('../service/membershipPlanService');
const resHandler = require('../utils/resHandler');

exports.getAll = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const includeInactive = req.query.includeInactive === 'true';

        const result = await membershipPlanService.getAll(page, limit, includeInactive);
        res.status(200).json(resHandler.success('Successfully fetched plans', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch plans'));
    }
};

exports.getById = async (req, res) => {
    try {
        const plan = await membershipPlanService.getById(parseInt(req.params.id));
        if (!plan) return res.status(404).json(resHandler.error('Plan not found'));
        res.status(200).json(resHandler.success('Successfully fetched plan', plan));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch plan'));
    }
};

exports.create = async (req, res) => {
    try {
        const { title, desc, price, durationDays, isActive } = req.body;
        if (!title) return res.status(400).json(resHandler.error('Title is required'));

        const parsedDuration = parseInt(durationDays);
        const finalDurationDays = (!parsedDuration || parsedDuration <= 0) ? null : parsedDuration;

        const plan = await membershipPlanService.create(req.user.id, { title, desc, price, durationDays: finalDurationDays, isActive });
        res.status(201).json(resHandler.success('Plan created successfully', plan));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to create plan'));
    }
};

exports.update = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.durationDays !== undefined) {
             const parsedDuration = parseInt(payload.durationDays);
             payload.durationDays = (!parsedDuration || parsedDuration <= 0) ? null : parsedDuration;
        }

        const plan = await membershipPlanService.update(req.user.id, parseInt(req.params.id), payload);
        res.status(200).json(resHandler.success('Plan updated successfully', plan));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to update plan'));
    }
};

exports.delete = async (req, res) => {
    try {
        await membershipPlanService.delete(req.user.id, parseInt(req.params.id));
        res.status(200).json(resHandler.success('Plan deleted successfully'));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to delete plan'));
    }
};

exports.purchase = async (req, res) => {
    try {
        const planId = parseInt(req.params.id, 10);
        if (!planId) return res.status(400).json(resHandler.error('Invalid plan id'));

        const result = await membershipPlanService.purchase(req.user.id, planId);
        res.status(200).json(resHandler.success('Membership purchase processed successfully', result));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to process membership purchase'));
    }
};
