'use strict';
require('dotenv').config();

const { launchBrowser } = require('../scrape/anime/9anime');

(async () => {
    console.log('Launching browser...');
    const browser = await launchBrowser();

    try {
        console.log(`\n--- Fetching Watch Page for AoT Final Season Part 1 ---`);
        const page = await browser.newPage();
        await page.goto("https://9animetv.to/watch/attack-on-titan-final-season-part-1-15548", { waitUntil: 'domcontentloaded' });
        const html = await page.content();
        const fs = require('fs');
        fs.writeFileSync('watch_page.html', html);
        console.log("Saved to watch_page.html");
        await page.close();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
        console.log('\nDone.');
    }
})();
