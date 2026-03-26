const { Router } = require('express');
const webhookController = require('../../controller/webhookController');

const route = Router();

route.post('/saweria', webhookController.handleSaweriaWebhook);

module.exports = route;
