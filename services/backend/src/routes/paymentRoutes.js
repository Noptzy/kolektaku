const express = require('express');
const router = express.Router();
const paymentController = require('../controller/paymentController');
const { authenticate } = require('../middleware/authenticate');

// Semua operasi payment membutuhkan login
router.use(authenticate);

router.post('/saweria', paymentController.createTransaction);
router.get('/saweria/:id/status', paymentController.getTransactionStatus);

module.exports = router;
