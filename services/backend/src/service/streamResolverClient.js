const rabbit = require('../config/rabbitmq');
const { logger } = require('../config/logger');

const QUEUE_NAME = 'stream_resolve_rpc';

const rpcClient = rabbit.createRPCClient({ confirm: true });

async function resolve(url, timeoutMs = 60000) {
    const workerId = `backend-rpc-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    logger.info(`[StreamResolverClient] Sending RPC to queue "${QUEUE_NAME}" for URL: ${url} (workerId: ${workerId})`);

    try {
        const response = await rpcClient.send(
            { routingKey: QUEUE_NAME },
            { url, workerId },
            { timeout: timeoutMs }
        );

        logger.info(`[StreamResolverClient] RPC response received for workerId: ${workerId}`);
        return response.body;
    } catch (error) {
        logger.error(`[StreamResolverClient] RPC failed: ${error.message}`);
        throw error;
    }
}

async function close() {
    await rpcClient.close();
}

module.exports = { resolve, close };
