require('dotenv').config();
const fs = require('fs');
const { launchBrowser, getEpisodeList } = require('./src/scrape/anime/9anime');

async function test() {
    const browser = await launchBrowser();
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36');
        
        await page.goto('https://9animetv.to/watch/sword-art-online-ii-4172', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));
        
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        fs.writeFileSync('watch-page-dump.html', html);
        console.log("Dumped HTML, length:", html.length);
        
        await page.screenshot({ path: 'watch-page-screenshot.png' });
        console.log("Dumped screenshot.");
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}
test();
