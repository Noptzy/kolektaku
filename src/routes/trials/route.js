const { Router } = require('express');
const trialController = require('../../controller/trialController');
const { authenticate, requireRole } = require('../../middleware/authenticate');

const route = Router();

// User-facing
route.post('/activate', authenticate, trialController.activate);
route.get('/status', authenticate, trialController.getStatus);

// Admin only
route.get('/', authenticate, requireRole(1), trialController.getAll);

module.exports = route;
