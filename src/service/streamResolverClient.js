const { logger } = require('../config/logger');
const streamService = require('./streamResolver/streamService');

/**
 * Directly resolve stream URL using local stream resolver service.
 * @param {string} url - The 9anime episode URL to resolve (e.g. https://9animetv.to/watch/anime?ep=1234)
 * @param {number} timeoutMs - Timeout in milliseconds (not used directly now, but kept for signature)
 * @returns {Promise<object>} Resolved stream data (sources, tracks, intro, outro, etc.)
 */
async function resolve(url, timeoutMs = 60000) {
    const workerId = `backend-local-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`;

    logger.info(`[StreamResolverClient] Resolving URL locally: ${url} (workerId: ${workerId})`);

    try {
        const result = await streamService.resolveEpisode(url, workerId);
        logger.info(`[StreamResolverClient] Resolution completed for workerId: ${workerId}`);
        return result;
    } catch (error) {
        logger.error(`[StreamResolverClient] Resolution failed: ${error.message}`);
        throw error;
    }
}

/**
 * No-op close function since we no longer use RabbitMQ
 */
async function close() {
    // No connection to close
}

module.exports = { resolve, close };
