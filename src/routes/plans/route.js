const { Router } = require('express');
const membershipPlanController = require('../../controller/membershipPlanController');
const { authenticate, requireRole } = require('../../middleware/authenticate');

const route = Router();

// Public: get active plans
route.get('/', membershipPlanController.getAll);
route.get('/:id', membershipPlanController.getById);

// Admin only: CUD
route.post('/', authenticate, requireRole(1), membershipPlanController.create);
route.put('/:id', authenticate, requireRole(1), membershipPlanController.update);
route.delete('/:id', authenticate, requireRole(1), membershipPlanController.delete);

module.exports = route;
