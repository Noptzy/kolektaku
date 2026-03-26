const { Router } = require('express');
const userController = require('../../controller/userController.js');
const { authenticate, requireRole } = require('../../middleware/authenticate.js');
const validate = require('../../middleware/validate.js');
const userValidation = require('../../validations/userValidation.js');

const route = Router();

route.use(authenticate, requireRole(1));

route.get('/', validate(userValidation.getAllUsers), userController.getAllUsers);
route.get('/:id', validate(userValidation.getUserById), userController.getUserById);
route.put('/:id', validate(userValidation.updateUser), userController.updateUser);
route.put('/:id/role', validate(userValidation.updateUserRole), userController.updateUserRole);
route.delete('/:id', validate(userValidation.deleteUser), userController.deleteUser);
route.post('/:id/membership', validate(userValidation.assignMembership), userController.assignMembership);

module.exports = route;