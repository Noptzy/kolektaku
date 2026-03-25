const { scrape, getStream } = require('../../scraper/anime/9anime');
const fs = require('fs');

(async () => {
    const url = 'https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19680';
    console.log(`Testing scraper with URL: ${url}`);

    const startTime = Date.now();
    const result = await scrape(url);
    const endTime = Date.now();

    console.log('--- Scraping Result ---');
    console.log(JSON.stringify(result, null, 2));
    console.log(`Time taken: ${(endTime - startTime) / 1000}s`);

    if (result && result.title && result.episodes.length > 0) {
        console.log('TEST PASSED: Scraper returned valid data.');
        const outputPath = 'jojo_part_4.json';
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`Result saved to ${outputPath}`);

        // TEST STREAM EXTRACTION FOR ALL EPISODES
        console.log(`\n--- Extracting Stream Data for ${result.episodes.length} Episodes ---`);

        const finalFilename = `${result.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;

        for (let i = 0; i < result.episodes.length; i++) {
            const episode = result.episodes[i];
            if (episode.external_id) {
                console.log(`[${i + 1}/${result.episodes.length}] Extracting stream for Episode ${episode.number} (ID: ${episode.external_id})...`);

                try {
                    // Add a small delay between requests to be polite
                    if (i > 0) await new Promise(r => setTimeout(r, 2000));

                    const streamResult = await getStream(episode.external_id);

                    if (streamResult) {
                        result.episodes[i].streams = streamResult;
                        console.log(`   > Success!`);
                    } else {
                        console.log(`   > Failed to get stream.`);
                        result.episodes[i].streams = null;
                    }
                } catch (err) {
                    console.error(`   > Error extracting stream: ${err.message}`);
                    result.episodes[i].streams = null;
                }
            }
        }

        fs.writeFileSync(finalFilename, JSON.stringify(result, null, 2));
        console.log(`\nAll data (metadata + streams) saved to ${finalFilename}`);
    } else {
        console.log('TEST FAILED: Data missing or episodes not found.');
    }
})();
