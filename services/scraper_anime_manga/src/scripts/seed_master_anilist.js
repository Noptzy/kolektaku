#!/usr/bin/env node
'use strict';

require('dotenv').config();
const prisma = require('../config/prisma');

const { fetchAniListPage, transformMedia, upsertMedia, CONFIG, isNsfwCheck, buildQuery } = require('../seeds/seedAnilist');

async function seedMasterAnilist() {
    console.log('============= MASTER ANILIST SEEDER =============');
    console.log(`Starting to scrape from page ${CONFIG.START_PAGE} up to page ${CONFIG.MAX_PAGE}.`);

    const query = buildQuery('ANIME');
    let totalInserted = 0;
    
    for (let page = CONFIG.START_PAGE; page <= CONFIG.MAX_PAGE; page++) {
        const variables = { page, perPage: CONFIG.PER_PAGE };
        const pageData = await fetchAniListPage(query, variables, 3);
        
        if (!pageData || !pageData.media || pageData.media.length === 0) {
            console.log(`Page ${page} is empty. Stopping.`);
            break;
        }

        let insertedOnPage = 0;
        for (const item of pageData.media) {
            try {
                // transform and upsert the media item
                const transformed = transformMedia(item, 'ANIME');
                await upsertMedia(transformed, {
                    metadataOnly: false, // Ensure full graph is saved if needed or adjust as per requirement
                    sourceContext: 'seed_master_anilist'
                });
                insertedOnPage++;
                totalInserted++;
            } catch (err) {
                console.error(`Error saving Anilist ID ${item.id} (${item.title?.romaji}): ${err.message}`);
            }
        }

        const pct = ((page / CONFIG.MAX_PAGE) * 100).toFixed(1);
        console.log(`[${pct}%] Page ${page} finished. Inserted ${insertedOnPage} anime (Total: ${totalInserted}).`);
        
        if (!pageData.pageInfo.hasNextPage || page >= pageData.pageInfo.lastPage) {
            console.log('Reached the last available page from AniList.');
            break;
        }
    }
    
    console.log('============= SEEDING COMPLETE =============');
    console.log(`Successfully processed ${totalInserted} items from AniList API.`);
}

seedMasterAnilist()
    .catch((err) => {
        console.error('Master Seeder failed:', err);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
