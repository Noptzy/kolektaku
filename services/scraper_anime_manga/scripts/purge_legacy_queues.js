'use strict';

const amqp = require('amqplib');

const DEFAULT_QUEUES = ['scrape_episode', 'scrape_detail', 'manual_scrape', 'fetch_schedule'];

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function getArgValue(prefix, fallback) {
    const arg = process.argv.find((item) => item.startsWith(`${prefix}=`));
    if (!arg) return fallback;
    return arg.slice(prefix.length + 1);
}

function getQueues() {
    const raw = getArgValue('--queues', DEFAULT_QUEUES.join(','));
    return String(raw)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const amqpUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const queues = getQueues();

    const connection = await amqp.connect(amqpUrl);
    const channel = await connection.createChannel();

    try {
        console.log(`[purge_legacy_queues] ${dryRun ? 'Dry-run' : 'Purging'} queues: ${queues.join(', ')}`);

        for (const queueName of queues) {
            await channel.assertQueue(queueName, { durable: true });

            const before = await channel.checkQueue(queueName);
            const beforeCount = before?.messageCount || 0;

            if (!dryRun) {
                await channel.purgeQueue(queueName);
            }

            const after = await channel.checkQueue(queueName);
            const afterCount = after?.messageCount || 0;

            console.log(
                `[purge_legacy_queues] ${queueName}: before=${beforeCount}, after=${afterCount}, purged=${Math.max(0, beforeCount - afterCount)}`,
            );
        }
    } finally {
        await channel.close();
        await connection.close();
    }
}

main().catch((error) => {
    console.error('[purge_legacy_queues] Failed:', error.message);
    process.exitCode = 1;
});
