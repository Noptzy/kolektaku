const amqp = require('amqplib');
const logger = require('../utils/logger');
const {
    getWorkerTotal,
    getShardForKey,
    getShardedQueueName,
} = require('../utils/queueSharding');

const SHARDED_QUEUES = ['scrape_detail', 'manual_scrape'];
const STATIC_QUEUES = ['scraping_tasks'];

function inferShardKey(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return payload.koleksiId
        || payload.anilistId
        || payload.scheduleId
        || payload.id
        || null;
}

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
    try {
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        connection = await amqp.connect(amqpUrl);
        channel = await connection.createChannel();
        
        const workerTotal = getWorkerTotal();

        for (const queueName of SHARDED_QUEUES) {
            await channel.assertQueue(queueName, { durable: true });

            for (let shard = 0; shard < workerTotal; shard += 1) {
                const shardedQueue = getShardedQueueName(queueName, shard);
                await channel.assertQueue(shardedQueue, { durable: true });
            }
        }

        // Assert static (non-sharded) queues
        for (const queueName of STATIC_QUEUES) {
            await channel.assertQueue(queueName, { durable: true });
        }

        logger.info('Connected to RabbitMQ');
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ:', error.message);
    }
};

const publishMessage = async (queue, payload, options = {}) => {
    try {
        if (!channel) {
            await connectRabbitMQ();
            if (!channel) throw new Error('RabbitMQ channel is not available');
        }

        let targetQueue = queue;
        const shouldShard = SHARDED_QUEUES.includes(queue) && options.shard !== false;
        if (shouldShard) {
            const shardKey = options.shardKey || inferShardKey(payload);
            if (shardKey) {
                const shard = getShardForKey(shardKey, getWorkerTotal());
                targetQueue = getShardedQueueName(queue, shard);
            }
        }

        const message = JSON.stringify(payload);
        channel.sendToQueue(targetQueue, Buffer.from(message), { persistent: true });
        logger.info(`Message published to queue ${targetQueue}`, payload);
    } catch (error) {
        logger.error(`Error publishing to queue ${queue}:`, error.message);
    }
};

module.exports = {
    connectRabbitMQ,
    publishMessage
};
