const crypto = require('crypto');

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return fallback;
}

function parseNonNegativeInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    return fallback;
}

function getWorkerTotal(input = process.env.WORKER_TOTAL) {
    return parsePositiveInt(input, 1);
}

function getWorkerIndex(input = process.env.NODE_APP_INSTANCE) {
    return parseNonNegativeInt(input, 0);
}

function normalizeShardKey(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function getShardForKey(key, totalWorkers = getWorkerTotal()) {
    const safeTotal = getWorkerTotal(totalWorkers);
    const normalized = normalizeShardKey(key);
    if (!normalized) return 0;

    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    const hashInt = Number.parseInt(hash.slice(0, 8), 16);
    return hashInt % safeTotal;
}

function isOwnedByWorker(key, totalWorkers = getWorkerTotal(), workerIndex = getWorkerIndex()) {
    const safeTotal = getWorkerTotal(totalWorkers);
    const safeWorker = getWorkerIndex(workerIndex) % safeTotal;
    return getShardForKey(key, safeTotal) === safeWorker;
}

function getShardedQueueName(baseQueue, shard) {
    return `${baseQueue}.w${shard}`;
}

function getWorkerQueueName(baseQueue, totalWorkers = getWorkerTotal(), workerIndex = getWorkerIndex()) {
    const shard = getWorkerIndex(workerIndex) % getWorkerTotal(totalWorkers);
    return getShardedQueueName(baseQueue, shard);
}

function resolveQueueForKey(baseQueue, key, totalWorkers = getWorkerTotal()) {
    const shard = getShardForKey(key, totalWorkers);
    return getShardedQueueName(baseQueue, shard);
}

module.exports = {
    getWorkerTotal,
    getWorkerIndex,
    getShardForKey,
    isOwnedByWorker,
    getShardedQueueName,
    getWorkerQueueName,
    resolveQueueForKey,
};
