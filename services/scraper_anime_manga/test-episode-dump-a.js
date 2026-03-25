require('dotenv').config();
const fs = require('fs');
const { launchBrowser } = require('./src/scrape/anime/9anime');

async function test() {
    const browser = await launchBrowser();
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36');
        
        console.log("Goto a-4172...");
        await page.goto('https://9animetv.to/watch/a-4172', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.log(e));
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("Final URL:", page.url());
        
        const html = await page.evaluate(() => document.documentElement.outerHTML);
        fs.writeFileSync('watch-page-dump-a-4172.html', html);
        console.log("Dumped HTML, length:", html.length);
        console.log("Has .ep-item ?", html.includes('ep-item'));
        
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}
test();
