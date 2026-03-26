const paymentService = require('../service/paymentService');
const resHandler = require('../utils/resHandler');

class PaymentController {
    async createTransaction(req, res, next) {
        try {
            const userId = req.user.id; // diasumsikan sudah ada auth middleware yg meng-inject req.user
            const email = req.user.email;
            const name = req.user.name;
            const { planId, voucherCode } = req.body;

            if (!planId) {
                return res.status(400).json(resHandler.error('planId is required'));
            }

            const checkoutData = await paymentService.createPayment(userId, email, name, Number(planId), voucherCode);

            res.status(200).json(resHandler.success('Transaction created', checkoutData));
        } catch (error) {
            console.error('Create transaction error:', error);
            const status = error.status || 500;
            const message = error.message || 'Internal server error';
            return res.status(status).json(resHandler.error(message));
        }
    }

    async getTransactionStatus(req, res, next) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json(resHandler.error('snapId is required'));
            }

            const statusData = await paymentService.checkPaymentStatus(id);

            res.status(200).json(resHandler.success('Status retrieved', statusData));
        } catch (error) {
            console.error('Get transaction status error:', error);
            const status = error.status || 500;
            const message = error.message || 'Internal server error';
            return res.status(status).json(resHandler.error(message));
        }
    }
}

module.exports = new PaymentController();
