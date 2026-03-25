const logger = require('../utils/logger');
const axios = require('axios');
const cheerio = require('cheerio')

async function resolveStream(job) {
    const { episodeId, uid } = job.data;
    
    logger.info(uid, `STARTED resolving episodeId: ${episodeId}`);

    try {
        logger.info(uid, `Fetching servers for episode ${episodeId}...`);
        const serverRes = await axios.get(`https://9animetv.to/ajax/episode/servers?episodeId=${episodeId}`);
        
        const $ = cheerio.load(serverRes.data.html);
        const sourceId = $('.servers-sub .server-item[data-server-id="4"]').attr('data-id');
        
        if (!sourceId) throw new Error('Source ID (data-id) not found!');

        logger.info(uid, `Found sourceId: ${sourceId}. Fetching iframe link...`);
        const sourceRes = await axios.get(`https://9animetv.to/ajax/episode/sources?id=${sourceId}`);
        const iframeLink = sourceRes.data.link;

        const rapidCloudId = iframeLink.split('/e-1/')[1].split('?')[0];

        logger.info(uid, `Extracted RapidCloud ID: ${rapidCloudId}. Fetching final stream...`);
        const finalRes = await axios.get(`https://rapid-cloud.co/embed-2/v2/e-1/getSources?id=${rapidCloudId}`);
        
        const m3u8 = finalRes.data.sources[0].file;
        const subtitles = finalRes.data.tracks;

        logger.info(uid, `FINISHED resolving. Successfully extracted m3u8.`);
        
        return { m3u8, subtitles };

    } catch (error) {
        logger.error(uid, `FAILED resolving episodeId ${episodeId}: ${error.message}`);
        throw error;
    }
}