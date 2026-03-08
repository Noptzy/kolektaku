const { Router } = require('express');
const authRoute = require('./auth/route');
const rolesRoute = require('./roles/route.js');
const usersRoute = require('./users/route.js')

const route = Router();

route.use('/auth', authRoute);
route.use('/roles', rolesRoute);
route.use('/users', usersRoute);

module.exports = route;