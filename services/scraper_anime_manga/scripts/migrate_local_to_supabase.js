'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const remoteUrl = process.env.DATABASE_URL;
const localUrl = "postgresql://postgres:236ndntm@localhost:5432/kolektaku_dev";

if (!remoteUrl || !localUrl) {
    console.error('Missing DATABASE_URL or Local URL');
    process.exit(1);
}

const localAdapter = new PrismaPg({ connectionString: localUrl });
const localPrisma = new PrismaClient({ adapter: localAdapter });

const remoteAdapter = new PrismaPg({ connectionString: remoteUrl });
const remotePrisma = new PrismaClient({ adapter: remoteAdapter });

const modelsToMigrate = [
    { name: 'membership_plans', prisma: 'membershipPlan' },
    { name: 'genres', prisma: 'genre' },
    { name: 'studios', prisma: 'studio' },
    { name: 'characters', prisma: 'character' },
    { name: 'voice_actors', prisma: 'voiceActor' },
    { name: 'staff', prisma: 'staff' },
    { name: 'koleksi', prisma: 'koleksi' },
    { name: 'koleksi_mappings', prisma: 'koleksiMapping' },
    { name: 'koleksi_genres', prisma: 'koleksiGenre' },
    { name: 'koleksi_studios', prisma: 'koleksiStudio' },
    { name: 'koleksi_characters', prisma: 'koleksiCharacter' },
    { name: 'koleksi_staff', prisma: 'koleksiStaff' },
    { name: 'koleksi_relations', prisma: 'koleksiRelation' },
    { name: 'anime_detail', prisma: 'animeDetail' },
    { name: 'manga_detail', prisma: 'mangaDetail' },
    { name: 'episodes', prisma: 'episode' },
    { name: 'chapters', prisma: 'chapter' },
    { name: 'episode_sources', prisma: 'episodeSource' },
    { name: 'airing_schedules', prisma: 'airingSchedule' },
    { name: 'pending_mappings', prisma: 'pendingMapping' },
    { name: 'mapping_candidates', prisma: 'mappingCandidate' },
    { name: 'scrape_logs', prisma: 'scrapeLog' }
];

const CHUNK_SIZE = 100;

async function migrate() {
    console.log('--- Database Migration Started (Optimized) ---');
    
    for (const model of modelsToMigrate) {
        if (!localPrisma[model.prisma]) continue;

        console.log(`\n[Migrate] Processing table: ${model.name}...`);
        try {
            const localData = await localPrisma[model.prisma].findMany();
            if (localData.length === 0) {
                console.log(`[Migrate] No data found in local ${model.name}.`);
                continue;
            }

            console.log(`[Migrate] Total records to check: ${localData.length}`);
            let inserted = 0;
            let updated = 0;
            let skipped = 0;

            for (let i = 0; i < localData.length; i += CHUNK_SIZE) {
                const chunk = localData.slice(i, i + CHUNK_SIZE);
                
                for (const item of chunk) {
                    const where = {};
                    if (model.name === 'koleksi_genres') {
                        where.koleksiId_genreId = { koleksiId: item.koleksiId, genreId: item.genreId };
                    } else if (model.name === 'koleksi_studios') {
                        where.koleksiId_studioId = { koleksiId: item.koleksiId, studioId: item.studioId };
                    } else if (model.name === 'koleksi_characters') {
                        where.koleksiId_characterId = { koleksiId: item.koleksiId, characterId: item.characterId };
                    } else if (model.name === 'koleksi_staff') {
                        where.koleksiId_staffId = { koleksiId: item.koleksiId, staffId: item.staffId };
                    } else if (item.id) {
                        where.id = item.id;
                    } else if (item.koleksiId && !['koleksi_mappings'].includes(model.name)) {
                         where.koleksiId = item.koleksiId;
                    } else {
                        const firstKey = Object.keys(item)[0];
                        where[firstKey] = item[firstKey];
                    }

                    try {
                        const existingRemotely = await remotePrisma[model.prisma].findUnique({ where });

                        if (existingRemotely) {
                            const localUpdatedAt = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
                            const remoteUpdatedAt = existingRemotely.updatedAt ? new Date(existingRemotely.updatedAt).getTime() : 0;

                            if (localUpdatedAt > remoteUpdatedAt) {
                                await remotePrisma[model.prisma].update({ where, data: item });
                                updated++;
                            } else {
                                skipped++;
                            }
                        } else {
                            await remotePrisma[model.prisma].create({ data: item });
                            inserted++;
                        }
                    } catch (err) {
                        console.error(`[Migrate] Error on item in ${model.name}:`, err.message);
                    }
                }

                if ((i + CHUNK_SIZE) % 1000 === 0 || i + CHUNK_SIZE >= localData.length) {
                    console.log(`[Migrate] Progress ${model.name}: ${Math.min(i + CHUNK_SIZE, localData.length)}/${localData.length}`);
                }
            }

            console.log(`[Migrate] Final ${model.name}: ${inserted} inserted, ${updated} updated, ${skipped} skipped.`);
        } catch (err) {
            console.error(`[Migrate] Error migrating table ${model.name}:`, err.message);
        }
    }

    console.log('\n--- Database Migration Finished ---');
    await localPrisma.$disconnect();
    await remotePrisma.$disconnect();
}

migrate();
