const { Router } = require('express');
const roleController = require('../../controller/roleController.js');

const route = Router();

route.get('/', roleController.getAllRoles);
route.put('/:id', roleController.updateRoleById);

module.exports = route;