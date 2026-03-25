require('dotenv').config();

const workerTotalFromEnv = Number.parseInt(process.env.WORKER_TOTAL || '5', 10);
const workerTotal = Number.isFinite(workerTotalFromEnv) && workerTotalFromEnv > 0
    ? workerTotalFromEnv
    : 5;

module.exports = {
    apps: [
        // ─── Master Anilist Seeder (run once manually) ───
        {
            name: 'kolektaku-phase1-master-anilist',
            script: 'src/scripts/seed_master_anilist.js',
            exec_mode: 'fork',
            instances: 1,
            autorestart: false,
            watch: false,
            env: {
                NODE_ENV: process.env.NODE_ENV || 'production',
                WORKER_TOTAL: String(workerTotal),
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/pm2-phase1-master-error.log',
            out_file: 'logs/pm2-phase1-master-out.log',
            merge_logs: true,
        },

        // ─── Phase 1 Worker: 9anime Seed (5 instances) ───
        {
            name: 'kolektaku-phase1-worker-9anime',
            script: 'src/scripts/seed_worker_9anime.js',
            exec_mode: 'cluster',
            instances: workerTotal,
            autorestart: false,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: process.env.NODE_ENV || 'production',
                WORKER_TOTAL: String(workerTotal),
                PREMIUM_PROXIES: process.env.PREMIUM_PROXIES || '',
                ENABLE_PREMIUM_PROXY: process.env.ENABLE_PREMIUM_PROXY || '0',
                USE_CLOUDFLARE_DNS: '1',
            },
            env_development: {
                NODE_ENV: 'development',
                WORKER_TOTAL: String(workerTotal),
                PREMIUM_PROXIES: process.env.PREMIUM_PROXIES || '',
                ENABLE_PREMIUM_PROXY: process.env.ENABLE_PREMIUM_PROXY || '0',
                USE_CLOUDFLARE_DNS: '1',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/pm2-phase1-worker-error.log',
            out_file: 'logs/pm2-phase1-worker-out.log',
            merge_logs: true,
        },
    ],
};
