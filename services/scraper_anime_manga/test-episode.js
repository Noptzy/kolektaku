require('dotenv').config();
const { launchBrowser, getEpisodeList } = require('./src/scrape/anime/9anime');

async function test() {
    console.log("Launching browser...");
    const browser = await launchBrowser();
    try {
        console.log("Fetching episode list for ID 4172 (Sword Art Online II)...");
        const results = await getEpisodeList(browser, '4172');
        console.log("Episodes found:", results.length);
        if (results.length > 0) {
            console.log("First episode:", results[0]);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
        console.log("Browser closed.");
    }
}
test();
