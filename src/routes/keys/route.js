const { Router } = require('express');
const keyController = require('../../controller/keyController');
const { authenticate } = require('../../middleware/authenticate');

const route = Router();

// All routes require auth
route.use(authenticate);

route.get('/balance', keyController.getBalance);
route.post('/ad-reward', keyController.addFromAd);
route.post('/purchase', keyController.purchase);
route.post('/consume', keyController.consume);

module.exports = route;
