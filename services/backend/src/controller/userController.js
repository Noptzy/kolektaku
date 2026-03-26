const userService = require('../service/userService');
const resHandler = require('../utils/resHandler');

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || null;

        const result = await userService.getAllUsers(page, limit, search);
        res.status(200).json(resHandler.success('Successfully fetched users', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch users'));
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id);
        if (!user) return res.status(404).json(resHandler.error('User not found'));

        res.status(200).json(resHandler.success('Successfully fetched user', user));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch user'));
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await userService.updateUser(req.user.id, req.params.id, req.body);
        res.status(200).json(resHandler.success('User updated successfully', user));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to update user'));
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { roleId } = req.body;
        if (!roleId) return res.status(400).json(resHandler.error('roleId is required'));

        const user = await userService.updateUserRole(req.user.id, req.params.id, roleId);
        res.status(200).json(resHandler.success('User role updated successfully', user));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to update role'));
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await userService.deleteUser(req.user.id, req.params.id);
        res.status(200).json(resHandler.success('User deleted successfully'));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to delete user'));
    }
};

exports.assignMembership = async (req, res) => {
    try {
        const { planId } = req.body;
        if (!planId) return res.status(400).json(resHandler.error('planId is required'));

        const result = await userService.assignMembership(req.user.id, req.params.id, planId);
        res.status(200).json(resHandler.success('Membership assigned successfully', result));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to assign membership'));
    }
};
