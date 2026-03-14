const { Router } = require('express');
const authRoute = require('./auth/route');
const rolesRoute = require('./roles/route.js');
const usersRoute = require('./users/route.js');
const animeRoute = require('./anime/route.js');
const plansRoute = require('./plans/route.js');
const vouchersRoute = require('./vouchers/route.js');
const trialsRoute = require('./trials/route.js');
const keysRoute = require('./keys/route.js');
const adminRoute = require('./admin/route.js');
const searchRoute = require('./search/route.js');

const route = Router();

route.use('/auth', authRoute);
route.use('/roles', rolesRoute);
route.use('/users', usersRoute);
route.use('/anime', animeRoute);
route.use('/plans', plansRoute);
route.use('/vouchers', vouchersRoute);
route.use('/trials', trialsRoute);
route.use('/keys', keysRoute);
route.use('/admin', adminRoute);
route.use('/search', searchRoute);

module.exports = route;