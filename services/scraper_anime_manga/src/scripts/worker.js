const amqp = require('amqplib');
require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@kolektaku/database');
const { logger } = require('../config/logger');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

// Actually we can just require specific logic or child_process to trigger existing scraper scripts

async function startWorker() {
    try {
        const amqpUrl = process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost';
        const connection = await amqp.connect(amqpUrl);
        const channel = await connection.createChannel();
        const queue = 'scraping_tasks';

        await channel.assertQueue(queue, { durable: true });
        logger.info(`[*] Worker waiting for messages in %s. To exit press CTRL+C`, queue);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const content = JSON.parse(msg.content.toString());
                logger.info(`[x] Received task: ${content.action}`);

                try {
                    if (content.action === 'manual_add') {
                        await handleManualAdd(content);
                    } else if (content.action === 'trigger_scrape') {
                        await handleTriggerScrape(content);
                    } else {
                        logger.warn(`Unknown action: ${content.action}`);
                    }
                    channel.ack(msg);
                } catch (err) {
                    logger.error(`[!] Error processing task:`, err);
                    // Nack with requeue=false if it's a permanent failure, but for now just ack to skip crash loops
                    channel.ack(msg);
                }
            }
        });
    } catch (err) {
        logger.error('Failed to start worker:', err);
    }
}

async function handleManualAdd(payload) {
    logger.info(`Processing manual add for AniList ID: ${payload.anilistId}`);
    
    // Quick fetching using the existing fetchAniListPage logic
    const fetchFunc = require('../seeds/seedAnilist').fetchAniListPage;
    
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          title { romaji english native }
          type format status description
          season seasonYear episodes duration
          coverImage { large extraLarge }
          bannerImage
          genres synonyms isAdult
          averageScore
          trailer { id site thumbnail }
        }
      }
    `;

    const variables = { id: payload.anilistId };
    
    try {
        // Since we don't have a direct helper we need to do raw GraphQL config
        const axios = require('axios');
        const response = await axios.post('https://graphql.anilist.co', { query, variables }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        const item = response.data?.data?.Media;
        if (!item) {
            logger.error(`AniList Item not found: ${payload.anilistId}`);
            return;
        }

        const { upsertMedia, transformMedia } = require('../seeds/seedAnilist');
        const mappedData = transformMedia(item, 'anime');
        const insertedKoleksiId = await upsertMedia(mappedData);
        logger.info(`[+] Successfully inserted/updated: ${item.title?.romaji || 'Unknown'} (ID: ${insertedKoleksiId})`);
        
        if (payload.adminId) {
            await prisma.adminAuditLog.create({
                data: {
                    adminId: payload.adminId,
                    action: 'SCRAPE_MANUAL_ADD_SUCCESS',
                    entityType: 'Koleksi',
                    entityId: insertedKoleksiId,
                    changes: { message: 'Successfully inserted/updated koleksi data', anilistId: payload.anilistId },
                    createdAt: new Date()
                }
            });
        }
    } catch (e) {
        logger.error('Failed to manual scrape AniList ID:', payload.anilistId, e?.response?.data || e.message);
        if (payload.adminId) {
            await prisma.adminAuditLog.create({
                data: {
                    adminId: payload.adminId,
                    action: 'SCRAPE_MANUAL_ADD_FAILED',
                    entityType: 'Koleksi',
                    changes: { error: e.message || String(e), anilistId: payload.anilistId },
                    createdAt: new Date()
                }
            });
        }
    }
}

async function handleTriggerScrape(payload) {
    try {
        logger.info(`[Worker] Starting trigger_scrape for ${payload.animeId} (Type: ${payload.type})`);
        
        if (payload.type === 'episodes') {
            logger.info(`[Worker] Executing scrape_episodes_single.js for KoleksiId: ${payload.animeId}`);
            
            const mapping = await prisma.koleksiMapping.findUnique({ where: { koleksiId: payload.animeId }});
            if (!mapping || !mapping.nineanimeId) {
                throw new Error('nineanimeId not found for this anime! Cannot scrape episodes. Pastikan mapping sembilan anime sudah ada.');
            }

            const cp = require('child_process');
            await new Promise((resolve, reject) => {
                const child = cp.spawn('node', ['src/scripts/scrape_episodes_single.js', payload.animeId, mapping.nineanimeId]);
                
                let outputLog = '';
                
                child.stdout.on('data', (data) => {
                    process.stdout.write(data);
                    outputLog += data.toString();
                });
                
                child.stderr.on('data', (data) => {
                    process.stderr.write(data);
                    outputLog += data.toString();
                });
                
                child.on('close', async (code) => {
                    if (code !== 0) {
                        logger.error('[Worker] Episode scrape failed with code:', code);
                        reject(new Error(`Process exited with code ${code}`));
                    } else {
                        logger.info('[Worker] Episode scrape SUCCESS');
                        if (payload.adminId) {
                            await prisma.adminAuditLog.create({
                                data: {
                                    adminId: payload.adminId,
                                    action: 'SCRAPE_TRIGGER_SUCCESS',
                                    entityType: 'Koleksi',
                                    entityId: payload.animeId,
                                    changes: { message: 'Successfully scraped episodes', type: 'episodes', logSnippet: outputLog.substring(0, 1000) },
                                    createdAt: new Date()
                                }
                            });
                        }
                        resolve();
                    }
                });
            });
        } else if (payload.type === 'detail') {
            if (!payload.anilistId) {
                logger.info(`[Worker] Cannot scrape detail without Anilist ID!`);
                throw new Error('Anilist ID is missing, cannot scrape detail.');
            }
            logger.info(`[Worker] Delegating detail scrape to handleManualAdd...`);
            await handleManualAdd({ anilistId: payload.anilistId, adminId: payload.adminId, type: 'trigger_scrape' });
        }
    } catch (error) {
        logger.error('[Worker] handleTriggerScrape error:', error.message);
        if (payload.adminId && payload.animeId) {
            try {
                await prisma.adminAuditLog.create({
                    data: {
                        adminId: payload.adminId,
                        action: 'SCRAPE_TRIGGER_FAILED',
                        entityType: 'Koleksi',
                        entityId: payload.animeId,
                        changes: { error: error.message },
                        createdAt: new Date()
                    }
                });
            } catch (auditErr) {
                logger.error('[Worker] Failed to create audit log for error:', auditErr.message);
            }
        }
    }
}

startWorker();
