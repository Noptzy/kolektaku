const logger = require('../utils/logger');
const resHandler = require('../utils/resHandler');
const saweriaWebhookService = require('../service/webhook/saweriaWebhookService');

const log = logger.createLogger('WebhookController');

exports.handleSaweriaWebhook = async (req, res) => {
    try {
        const result = await saweriaWebhookService.processWebhook(req.body);

        if (!result.processed) {
            log.warn(`Saweria webhook acknowledged without processing: ${result.reason}`);
        }
    } catch (error) {
        log.error(`Unhandled Saweria webhook error: ${error.message}`);
    }

    return res.status(200).json(resHandler.success('Saweria webhook acknowledged'));
};
