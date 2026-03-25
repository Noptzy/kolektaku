'use strict';

const { spawn } = require('child_process');

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return fallback;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function getArgValue(prefix, fallback) {
    const arg = process.argv.find((item) => item.startsWith(`${prefix}=`));
    if (!arg) return fallback;
    return arg.slice(prefix.length + 1);
}

function runCommand(command, env = process.env) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, {
            cwd: process.cwd(),
            env,
            stdio: 'inherit',
            shell: true,
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Command failed (${code}): ${command}`));
        });
    });
}

function printHelp() {
    console.log(`
Usage:
  node scripts/seed_then_workers.js [--worker-total=5] [--media=anime|manga|all] [--full-seed] [--no-purge-legacy]

Defaults:
  --worker-total: from WORKER_TOTAL env, fallback 5
  --media: anime
  seed mode: metadata-only (use --full-seed to run full seed)
  legacy queues: purged before worker start

Examples:
  node scripts/seed_then_workers.js
  node scripts/seed_then_workers.js --worker-total=8 --media=all
  node scripts/seed_then_workers.js --full-seed
  node scripts/seed_then_workers.js --no-purge-legacy
`);
}

async function purgeLegacyQueues(env) {
    await runCommand('node scripts/purge_legacy_queues.js', env);
}

async function startOrRestartWorkers(env) {
    const startCmd = 'npx pm2 start pm2.config.js --only kolektaku-scraper-worker --update-env';

    try {
        await runCommand(startCmd, env);
    } catch (error) {
        console.warn('[seed_then_workers] PM2 start failed, trying restart...');
        await runCommand('npx pm2 restart kolektaku-scraper-worker --update-env', env);
    }
}

async function main() {
    if (hasFlag('--help') || hasFlag('-h')) {
        printHelp();
        return;
    }

    const workerTotalInput = getArgValue('--worker-total', process.env.WORKER_TOTAL || '5');
    const workerTotal = parsePositiveInt(workerTotalInput, 5);

    const media = (getArgValue('--media', 'anime') || 'anime').toLowerCase();
    if (!['anime', 'manga', 'all'].includes(media)) {
        throw new Error(`Invalid --media value: ${media}`);
    }

    const metadataOnly = !hasFlag('--full-seed');
    const shouldPurgeLegacy = !hasFlag('--no-purge-legacy');

    const env = {
        ...process.env,
        WORKER_TOTAL: String(workerTotal),
        MASTER_ONLY: '1',
        SEED_MODE: metadataOnly ? 'metadata' : 'full',
        CONSUME_LEGACY_QUEUES: '0',
    };

    console.log(`[seed_then_workers] WORKER_TOTAL=${workerTotal}`);
    console.log(`[seed_then_workers] Running ${media} seed (${metadataOnly ? 'metadata-only' : 'full'})...`);

    const seedFlags = metadataOnly ? '--metadata-only --master-only' : '--master-only';
    await runCommand(`node src/seeds/seedAnilist.js ${media} ${seedFlags}`, env);

    if (shouldPurgeLegacy) {
        console.log('[seed_then_workers] Purging legacy queues before worker startup...');
        await purgeLegacyQueues(env);
    }

    console.log('[seed_then_workers] Seed completed. Starting PM2 workers...');
    await startOrRestartWorkers(env);

    console.log('[seed_then_workers] Workers are up.');
    await runCommand('npx pm2 ls', env);
}

main().catch((error) => {
    console.error('[seed_then_workers] Failed:', error.message);
    process.exitCode = 1;
});
