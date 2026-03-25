#!/usr/bin/env node

const { spawn } = require('child_process');

function parseArgs(argv) {
  const args = {
    workerTotal: process.env.WORKER_TOTAL || '5',
    restart: false,
    withSchedule: false,
  };

  for (const arg of argv) {
    if (arg.startsWith('--worker-total=')) {
      args.workerTotal = arg.split('=')[1] || args.workerTotal;
    } else if (arg === '--restart') {
      args.restart = true;
    } else if (arg === '--with-schedule') {
      args.withSchedule = true;
    }
  }

  return args;
}

function runCommand(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      env,
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = {
    ...process.env,
    WORKER_TOTAL: String(args.workerTotal),
    CONSUME_LEGACY_QUEUES: '0',
    ENABLE_SCHEDULE_SYNC: args.withSchedule ? '1' : '0',
  };

  const action = args.restart ? 'restart' : 'start';
  console.log(`[PM2] ${action} workers only`);
  console.log(
    `[PM2] WORKER_TOTAL=${env.WORKER_TOTAL} CONSUME_LEGACY_QUEUES=${env.CONSUME_LEGACY_QUEUES} ENABLE_SCHEDULE_SYNC=${env.ENABLE_SCHEDULE_SYNC}`,
  );

  if (args.restart) {
    try {
      await runCommand('npx pm2 restart kolektaku-scraper-worker --update-env', env);
    } catch (error) {
      console.warn(`[PM2] Restart failed (${error.message}), trying start...`);
      await runCommand('npx pm2 start pm2.config.js --only kolektaku-scraper-worker --update-env', env);
    }
  } else {
    try {
      await runCommand('npx pm2 start pm2.config.js --only kolektaku-scraper-worker --update-env', env);
    } catch (error) {
      console.warn(`[PM2] Start failed (${error.message}), trying restart...`);
      await runCommand('npx pm2 restart kolektaku-scraper-worker --update-env', env);
    }
  }

  await runCommand('npx pm2 ls', env);
}

main().catch((error) => {
  console.error('[PM2] Workers-only launcher failed:', error.message);
  process.exit(1);
});
