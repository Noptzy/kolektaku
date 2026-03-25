'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { prisma } = require('../seeds/seedAnilist');

async function syncAiringSchedule(dateStr = null) {
    if (!dateStr) {
        const today = new Date();
        dateStr = today.toISOString().split('T')[0];
    }
    
    console.log(`[ScheduleSync] Fetching schedule for ${dateStr} from 9anime...`);
    const url = `https://9animetv.to/ajax/schedule/list?tzOffset=-420&date=${dateStr}`;
    
    try {
        const response = await axios.get(url);
        const html = response.data?.html || '';
        if (!html) {
            console.log(`[ScheduleSync] No HTML returned for date ${dateStr}`);
            return { processed: 0, added: 0 };
        }

        const $ = cheerio.load(html);
        const liElements = $('li');
        let processedAtLeastOne = false;
        let addedCount = 0;

        for (const el of liElements) {
            const anchor = $(el).find('a.tsl-link');
            const href = anchor.attr('href') || '';
            const match = href.match(/-(\d+)$/);
            if (!match) continue;

            const nineanimeId = match[1];
            const timeStr = $(el).find('.time').text().trim();
            const btnText = $(el).find('.btn-play').text().trim();
            
            const epMatch = btnText.match(/Episode\s+([\d\.]+)/i);
            const episodeNumber = epMatch ? parseFloat(epMatch[1]) : null;

            if (!episodeNumber || !timeStr) continue;

            processedAtLeastOne = true;

            const mapping = await prisma.koleksiMapping.findFirst({
                where: { nineanimeId },
                include: { 
                    koleksi: {
                        include: { animeDetail: true }
                    } 
                }
            });

            if (!mapping) continue;

            const [hours, minutes] = timeStr.split(':').map(Number);
            const airingDate = new Date(`${dateStr}T00:00:00Z`); 
            airingDate.setUTCHours(hours - 7); 
            airingDate.setUTCMinutes(minutes);

            let isAlreadyInDb = false;
            if (mapping.koleksi.animeDetail) {
                const epInDb = await prisma.episode.findFirst({
                    where: {
                        animeId: mapping.koleksi.animeDetail.id,
                        episodeNumber
                    }
                });
                if (epInDb) isAlreadyInDb = true;
            }

            const existing = await prisma.airingSchedule.findFirst({
                where: {
                    koleksiId: mapping.koleksiId,
                    episodeNumber
                }
            });

            if (!existing) {
                await prisma.airingSchedule.create({
                    data: {
                        koleksiId: mapping.koleksiId,
                        episodeNumber,
                        airingAt: airingDate,
                        isScraped: isAlreadyInDb,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
                addedCount++;
            } else {
                const timeDiff = Math.abs(existing.airingAt.getTime() - airingDate.getTime());
                if (timeDiff > 60000 && !existing.isScraped) {
                    await prisma.airingSchedule.update({
                        where: { id: existing.id },
                        data: { 
                            airingAt: airingDate,
                            updatedAt: new Date()
                        }
                    });
                }
                
                if (isAlreadyInDb && !existing.isScraped) {
                    await prisma.airingSchedule.update({
                        where: { id: existing.id },
                        data: { isScraped: true, updatedAt: new Date() }
                    });
                }
            }
        }
        
        return { processed: processedAtLeastOne, added: addedCount };
    } catch (err) {
        console.error(`[ScheduleSync] Error syncing schedule:`, err.message);
        throw err;
    }
}

module.exports = { syncAiringSchedule };
