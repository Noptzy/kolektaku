const { Router } = require('express');
const controller = require('../../controller/airingSchedulePublicController');

const route = Router();

route.get('/', controller.getWeekly);

module.exports = route;
