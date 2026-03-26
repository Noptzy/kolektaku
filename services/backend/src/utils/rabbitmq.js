const amqp = require('amqplib');
const {
    getWorkerTotal,
    getShardForKey,
    getShardedQueueName,
} = require('./queueSharding');

const SHARDED_QUEUES = ['scrape_detail', 'scrape_episode', 'manual_scrape', 'fetch_schedule'];

function inferShardKey(payload) {
    if (!payload || typeof payload !== 'object') return null;
    return payload.koleksiId
        || payload.anilistId
        || payload.scheduleId
        || payload.id
        || null;
}

class RabbitMQConfig {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    }

    async connect() {
        try {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
            
            const workerTotal = getWorkerTotal();

            for (const queueName of SHARDED_QUEUES) {
                await this.channel.assertQueue(queueName, { durable: true });

                for (let shard = 0; shard < workerTotal; shard += 1) {
                    const shardedQueue = getShardedQueueName(queueName, shard);
                    await this.channel.assertQueue(shardedQueue, { durable: true });
                }
            }

            console.log('RabbitMQ connected successfully');
        } catch (error) {
            console.error('RabbitMQ connection error:', error.message);
        }
    }

    async produceMessage(queueName, data, options = {}) {
        if (!this.channel) {
            await this.connect();
        }
        
        if (this.channel) {
            let targetQueue = queueName;
            const shouldShard = SHARDED_QUEUES.includes(queueName) && options.shard !== false;

            if (shouldShard) {
                const shardKey = options.shardKey || inferShardKey(data);
                if (shardKey) {
                    const shard = getShardForKey(shardKey, getWorkerTotal());
                    targetQueue = getShardedQueueName(queueName, shard);
                }
            }

            const message = JSON.stringify(data);
            this.channel.sendToQueue(targetQueue, Buffer.from(message), { persistent: true });
        } else {
            throw new Error('RabbitMQ channel is not available');
        }
    }
}

const rabbitMQConfig = new RabbitMQConfig();
rabbitMQConfig.connect().catch(console.error);

module.exports = rabbitMQConfig;
