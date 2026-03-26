const axios = require('axios');
const cheerio = require('cheerio');
const prisma = require('../config/prisma');
const logger = require('../utils/logger');

class ScheduleSyncService {
    constructor() {
        this.baseUrl = 'https://9animetv.to/ajax/schedule/list';
        this.tzOffset = -420;
    }

    async syncSchedule(dateStr) {
        try {
            logger.info(`[ScheduleSync] Fetching schedule for ${dateStr} from 9anime...`);
            
            const response = await axios.get(this.baseUrl, {
                params: {
                    tzOffset: this.tzOffset,
                    date: dateStr
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 10000
            });

            if (!response.data || !response.data.html) {
                throw new Error('Invalid response from 9anime');
            }

            const $ = cheerio.load(response.data.html);
            const items = $('li');
            
            logger.info(`[ScheduleSync] Found ${items.length} items for ${dateStr}`);

            let savedCount = 0;
            let mappedCount = 0;

            for (let i = 0; i < items.length; i++) {
                const li = $(items[i]);
                const title = li.find('.film-name').text().trim();
                const timeStr = li.find('.time').text().trim(); 
                const episodeText = li.find('.btn-play').text().trim(); 
                
                if (!title || !timeStr || !episodeText) continue;

                const epMatch = episodeText.match(/Episode\s+(\d+)/i);
                const episodeNumber = epMatch ? parseInt(epMatch[1]) : 0;
                const airingAt = new Date(`${dateStr}T${timeStr}:00+07:00`);

                const koleksi = await prisma.koleksi.findFirst({
                    where: {
                        OR: [
                            { title: { contains: title, mode: 'insensitive' } },
                            { altTitles: { path: ['$'], array_contains: title } }
                        ]
                    }
                });

                if (koleksi) {
                    const existing = await prisma.airingSchedule.findFirst({
                        where: {
                            koleksiId: koleksi.id,
                            airingAt: airingAt
                        }
                    });

                    if (existing) {
                        await prisma.airingSchedule.update({
                            where: { id: existing.id },
                            data: {
                                episodeNumber,
                                updatedAt: new Date()
                            }
                        });
                    } else {
                        await prisma.airingSchedule.create({
                            data: {
                                koleksiId: koleksi.id,
                                episodeNumber,
                                airingAt,
                                isScraped: false,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            }
                        });
                    }
                    mappedCount++;
                }
                savedCount++;
            }

            return { total: items.length, saved: savedCount, mapped: mappedCount };

        } catch (error) {
            logger.error(`[ScheduleSync] Error syncing schedule for ${dateStr}:`, error.message);
            throw error;
        }
    }

    async syncRange(days = 7) {
        const now = new Date();
        const results = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            try {
                const res = await this.syncSchedule(dateStr);
                results.push({ date: dateStr, ...res });
            } catch (err) {
                results.push({ date: dateStr, error: err.message });
            }
        }
        return results;
    }
}

module.exports = new ScheduleSyncService();
