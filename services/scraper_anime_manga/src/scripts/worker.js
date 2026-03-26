'use strict';

/**
 * Worker — RabbitMQ Consumer (Clean Dispatcher)
 * 
 * Listens to `scraping_tasks` queue and dispatches to SOLID handlers:
 * - manual_add       → manualAddHandler
 * - trigger_scrape   → triggerScrapeHandler
 * - batch_map_9anime → batchMapHandler
 * - schedule_scrape  → scheduleScrapeHandler
 */

const amqp = require('amqplib');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const { logger } = require('../config/logger');

// ─── Handler Imports (SOLID: each handler is a single-responsibility module) ───
const { handleManualAdd }       = require('../handlers/manualAddHandler');
const { handleTriggerScrape }   = require('../handlers/triggerScrapeHandler');
const { handleBatchMap }        = require('../handlers/batchMapHandler');
const { handleScheduleScrape }  = require('../handlers/scheduleScrapeHandler');

// ─── Action → Handler Map ───
const ACTION_HANDLERS = {
    manual_add:       handleManualAdd,
    trigger_scrape:   handleTriggerScrape,
    batch_map_9anime: handleBatchMap,
    schedule_scrape:  handleScheduleScrape,
};

async function startWorker() {
    try {
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost';
        const connection = await amqp.connect(amqpUrl);
        const channel = await connection.createChannel();
        const queue = 'scraping_tasks';

        await channel.assertQueue(queue, { durable: true });
        logger.info(`[Worker] Listening on queue "${queue}". Actions: [${Object.keys(ACTION_HANDLERS).join(', ')}]`);

        channel.consume(queue, async (msg) => {
            if (msg === null) return;

            const content = JSON.parse(msg.content.toString());
            const action = content.action;
            logger.info(`[Worker] Received: ${action}`);

            try {
                const handler = ACTION_HANDLERS[action];
                if (!handler) {
                    logger.warn(`[Worker] Unknown action: ${action}`);
                } else {
                    await handler(content);
                }
                channel.ack(msg);
            } catch (err) {
                logger.error(`[Worker] Error processing "${action}":`, err.message);
                channel.ack(msg); // ack to prevent crash loops
            }
        });
    } catch (err) {
        logger.error('[Worker] Failed to start:', err.message);
        process.exit(1);
    }
}

startWorker();
