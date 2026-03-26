const { Connection } = require('rabbitmq-client');
const { logger } = require('./logger');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost';

const rabbit = new Connection(RABBITMQ_URL);

rabbit.on('error', (err) => {
    logger.error(`RabbitMQ connection error: ${err.message}`);
});

rabbit.on('connection', () => {
    logger.info('RabbitMQ connected successfully');
});

module.exports = rabbit;
