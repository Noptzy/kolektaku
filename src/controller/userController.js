const userService = require('../service/userService');
const bcrypt = require('bcryptjs');
const resHandler = require('../utils/resHandler');

exports.getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const result = await userService.getAllUsers(page, limit);
        res.status(200).json(resHandler.success('Successfully fetched users', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to fetch users'));
    }
};
