const { Router } = require('express');
const voucherController = require('../../controller/voucherController');
const { authenticate, requireRole } = require('../../middleware/authenticate');

const route = Router();

// User-facing
route.get('/active', voucherController.getActive);
route.post('/validate', authenticate, voucherController.validate);

// Admin only
route.get('/', authenticate, requireRole(1), voucherController.getAll);
route.get('/:id', authenticate, requireRole(1), voucherController.getById);
route.get('/:id/usages', authenticate, requireRole(1), voucherController.getUsages);
route.post('/', authenticate, requireRole(1), voucherController.create);
route.put('/:id', authenticate, requireRole(1), voucherController.update);
route.delete('/:id', authenticate, requireRole(1), voucherController.delete);

module.exports = route;
