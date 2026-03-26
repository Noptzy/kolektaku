#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') })

const path = require('path');
const { spawn } = require('child_process');

const prisma = require('../src/config/prisma');

const EXPECTED_DB_NAME = 'kolektaku_dev1';
const ROOT_DIR = path.resolve(__dirname, '..');

function parseDatabaseName(databaseUrl) {
    try {
        const parsed = new URL(databaseUrl);
        return parsed.pathname.replace(/^\//, '');
    } catch {
        return null;
    }
}

function runCommand(command, args, env = process.env) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            shell: process.platform === 'win32',
            env,
        });

        child.on('error', reject);
        child.on('close', (code) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
        });
    });
}

async function validateReadiness() {
    const [check] = await prisma.$queryRawUnsafe(`
        SELECT
          to_regclass('public.pending_mappings') IS NOT NULL AS "pendingMappingReady",
          to_regclass('public.scrape_logs') IS NOT NULL AS "scrapeLogReady",
          EXISTS (
            SELECT 1
            FROM pg_indexes
            WHERE schemaname = 'public'
              AND tablename = 'koleksi_mappings'
              AND indexdef ILIKE '%myanimelist_id%'
          ) AS "malIdIndexed"
    `);

    if (!check?.pendingMappingReady || !check?.scrapeLogReady || !check?.malIdIndexed) {
        throw new Error(`Readiness check failed: ${JSON.stringify(check || {})}`);
    }

    console.log('[DatabaseCleaner] Readiness check passed: PendingMapping, ScrapeLog, MAL_ID index are available.');
}

async function main() {
    const force = process.argv.includes('--force');
    if (!force) {
        console.error('[DatabaseCleaner] Refusing to reset database without --force flag.');
        process.exit(1);
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('[DatabaseCleaner] DATABASE_URL is missing.');
        process.exit(1);
    }

    const dbName = parseDatabaseName(databaseUrl);
    if (!dbName) {
        console.error('[DatabaseCleaner] Could not parse DATABASE_URL.');
        process.exit(1);
    }

    if (dbName !== EXPECTED_DB_NAME) {
        console.error(`[DatabaseCleaner] Refusing reset. Expected database ${EXPECTED_DB_NAME}, got ${dbName}.`);
        process.exit(1);
    }

    try {
        console.log(`[DatabaseCleaner] Resetting schema on ${dbName}...`);
        await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
        await prisma.$executeRawUnsafe('CREATE SCHEMA public');
        await prisma.$disconnect();

        console.log('[DatabaseCleaner] Running Prisma migrations...');
        await runCommand('npx', ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma']);

        console.log('[DatabaseCleaner] Validating schema readiness...');
        await validateReadiness();
    } catch (error) {
        console.error(`[DatabaseCleaner] Failed: ${error.message}`);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
