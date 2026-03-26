require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const workerTotalFromEnv = Number.parseInt(process.env.WORKER_TOTAL || '5', 10);
const workerTotal = Number.isFinite(workerTotalFromEnv) && workerTotalFromEnv > 0
    ? workerTotalFromEnv
    : 5;

module.exports = {
    apps: [
        // ─── Phase 1: 9anime Mapping Seeders ───
        {
            name: 'seed-9anime',
            script: 'src/scripts/seed_worker_9anime.js',
            exec_mode: 'cluster',
            instances: workerTotal,
            autorestart: false,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: process.env.NODE_ENV || 'production',
                WORKER_TOTAL: String(workerTotal),
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/pm2-seed-9anime-error.log',
            out_file: 'logs/pm2-seed-9anime-out.log',
            merge_logs: true,
        },
        // ─── Episode Sync Workers (5 instances via PM2 cluster) ───
        {
            name: 'seed-episodes',
            script: 'src/scripts/seed_episodes_batch.js',
            exec_mode: 'cluster',
            instances: workerTotal,
            autorestart: false,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: process.env.NODE_ENV || 'production',
                WORKER_TOTAL: String(workerTotal),
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/pm2-seed-episodes-error.log',
            out_file: 'logs/pm2-seed-episodes-out.log',
            merge_logs: true,
        },
    ],
};
