const RoleService = require('../service/RoleService.js');
const resHandler = require('../utils/resHandler');

exports.getAllRoles = async (req, res) => {
    try {
        const roles = await RoleService.getAllRoles();
        res.json(resHandler.success('Successfully Get All Roles', roles));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to Get Roles'));
    }
};

exports.updateRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const { title } = req.body;

        if (!id) {
            res.status(400).json(resHandler.error('Role ID is required'));
            return;
        }

        const role = await RoleService.updateRoleById(Number(id), { title });

        res.json(resHandler.success('Successfully Update Role', role));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to Update Role'));
    }
};
