const crypto = require('crypto');

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return fallback;
}

function getWorkerTotal() {
    return parsePositiveInt(process.env.WORKER_TOTAL, 1);
}

function normalizeShardKey(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function getShardForKey(key, totalWorkers = getWorkerTotal()) {
    const safeTotal = parsePositiveInt(totalWorkers, 1);
    const normalized = normalizeShardKey(key);
    if (!normalized) return 0;

    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    const hashInt = Number.parseInt(hash.slice(0, 8), 16);
    return hashInt % safeTotal;
}

function getShardedQueueName(baseQueue, shard) {
    return `${baseQueue}.w${shard}`;
}

module.exports = {
    getWorkerTotal,
    getShardForKey,
    getShardedQueueName,
};
