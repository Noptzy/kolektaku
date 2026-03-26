const express = require('express');
const { authenticate, requireRole } = require('../../middleware/authenticate');
const reportController = require('../../controller/reportController');

const router = express.Router();

// User routes
router.post('/episode/:episodeId', authenticate, reportController.submitReport);
router.get('/me', authenticate, reportController.getUserReports);

// Admin routes
router.get('/', authenticate, requireRole(1), reportController.getReports);
router.put('/:id/resolve', authenticate, requireRole(1), reportController.resolveReport);
router.put('/:id/dismiss', authenticate, requireRole(1), reportController.dismissReport);
router.delete('/:id', authenticate, requireRole(1), reportController.deleteReport);

module.exports = router;
