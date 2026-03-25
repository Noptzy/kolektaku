#!/usr/bin/env node

require('dotenv').config();

const path = require('path');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const MASTER_SCRIPT = path.join(ROOT_DIR, 'src', 'seeds', 'seedAnilist.js');

function runNodeScript(scriptPath, args, env) {
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, ...args], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            env,
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`Master AniList seed failed with exit code ${code}`));
        });
    });
}

async function main() {
    const mode = (process.env.MASTER_SEED_MODE || 'metadata').toLowerCase();
    const metadataOnly = mode !== 'full';
    const args = ['anime', '--master-only'];

    if (metadataOnly) {
        args.push('--metadata-only');
    }

    const env = {
        ...process.env,
        MASTER_ONLY: '1',
        SEED_MODE: metadataOnly ? 'metadata' : 'full',
    };

    console.log(`[MasterAnilist] Starting one-time AniList master seed (${env.SEED_MODE})...`);
    await runNodeScript(MASTER_SCRIPT, args, env);
    console.log('[MasterAnilist] Completed successfully.');
}

main().catch((error) => {
    console.error(`[MasterAnilist] Failed: ${error.message}`);
    process.exit(1);
});
