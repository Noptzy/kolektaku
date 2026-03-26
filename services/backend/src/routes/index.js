const { Router } = require('express');
const authRoute = require('./auth/route');
const rolesRoute = require('./roles/route.js');
const usersRoute = require('./users/route.js');
const animeRoute = require('./anime/route.js');
const plansRoute = require('./plans/route.js');
const vouchersRoute = require('./vouchers/route.js');
const trialsRoute = require('./trials/route.js');
const adminRoute = require('./admin/route.js');
const meRoute = require('./me/route.js');
const searchRoute = require('./search/route.js');
const schedulesRoute = require('./schedules/route.js');
const webhooksRoute = require('./webhooks/route.js');
const paymentRoutes = require('./paymentRoutes');
const reportsRoute = require('./reports/route.js');
const commentsRoute = require('./comments/route.js');
const chatRoute = require('./chat/route.js');

const route = Router();

route.use('/auth', authRoute);
route.use('/roles', rolesRoute);
route.use('/users', usersRoute);
route.use('/anime', animeRoute);
route.use('/plans', plansRoute);
route.use('/vouchers', vouchersRoute);
route.use('/trials', trialsRoute);
route.use('/admin', adminRoute);
route.use('/me', meRoute);
route.use('/search', searchRoute);
route.use('/schedules', schedulesRoute);
route.use('/webhooks', webhooksRoute);
route.use('/payments', paymentRoutes);
route.use('/reports', reportsRoute);
route.use('/comments', commentsRoute);
route.use('/chat', chatRoute);

module.exports = route;
