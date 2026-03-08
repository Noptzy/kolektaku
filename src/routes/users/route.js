const { Router } = require('express');
const userController = require('../../controller/userController.js');

const route = Router();

route.get('/', userController.getAllUsers);

module.exports = route;