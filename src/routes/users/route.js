const { Router } = require('express');
const userController = require('../../controller/userController.js');
const { authenticate, requireRole } = require('../../middleware/authenticate.js');

const route = Router();

// All routes require admin auth
route.use(authenticate, requireRole(1));

route.get('/', userController.getAllUsers);
route.get('/:id', userController.getUserById);
route.put('/:id', userController.updateUser);
route.put('/:id/role', userController.updateUserRole);
route.delete('/:id', userController.deleteUser);
route.post('/:id/membership', userController.assignMembership);

module.exports = route;