require('dotenv').config();
const { launchBrowser, searchAnime } = require('./src/scrape/anime/9anime');

async function test() {
    console.log("Launching browser...");
    const browser = await launchBrowser();
    try {
        console.log("Searching anime...");
        const results = await searchAnime(browser, "One Piece", { maxPages: 1 });
        console.log("Results found:", results.length);
        if (results.length > 0) {
            console.log("First result:", results[0]);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
        console.log("Browser closed.");
    }
}
test();
