'use strict';
require('dotenv').config();

const { launchBrowser, searchAnime } = require('../scrape/anime/9anime');
const fs = require('fs');

(async () => {
    const browser = await launchBrowser();
    try {
        console.log('--- Searching for "Naruto Shippuuden" ---');
        const results = await searchAnime(browser, 'Naruto Shippuuden', { maxPages: 1 });
        
        const relevant = results.filter(r => r.title.toLowerCase().includes('naruto'));
        fs.writeFileSync('naruto_search.json', JSON.stringify(relevant, null, 2));
        console.log(`Found ${relevant.length} Naruto results. Saved to naruto_search.json`);
        
        relevant.slice(0, 10).forEach(r => {
            console.log(`  ID: ${r.nineanimeId} | "${r.title}" | JP: "${r.japaneseTitle}"`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
