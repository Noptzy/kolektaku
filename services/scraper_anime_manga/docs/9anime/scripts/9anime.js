const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const mapStatus = (statusText) => {
    const lower = statusText?.toLowerCase() || '';
    if (lower.includes('finished') || lower.includes('completed')) return 'completed';
    if (lower.includes('currently') || lower.includes('ongoing')) return 'ongoing';
    if (lower.includes('upcoming')) return 'upcoming';
    return 'ongoing'; // Default
};

const mapType = (typeText) => {
    const lower = typeText?.toLowerCase() || '';
    if (lower.includes('tv')) return 'anime';
    if (lower.includes('movie')) return 'anime'; // Map movie to anime for now, or add specific type if schema supports
    if (lower.includes('ova')) return 'anime';
    if (lower.includes('ona')) return 'anime';
    return 'anime';
};

async function scrape(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--host-resolver-rules=MAP 9animetv.to 104.21.83.186',
                '--ignore-certificate-errors'
            ]
        });
        const page = await browser.newPage();

        // Block images and fonts to speed up
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for key elements to ensure dynamic content is loaded
        // .film-name is usually static, but episode list might take time (e.g. #episodes-page-1 or .episodes-ul)
        // trying to wait for the episode list container
        try {
            // Wait for the episode list to actually populate
            await page.waitForSelector('.episodes-ul a', { timeout: 10000 });
        } catch (e) {
            console.warn("Episode list selector timeout (.episodes-ul a), proceeding anyway...");
            // Maybe check for a slightly different class if structure varies
        }

        const data = await page.evaluate(() => {
            const getText = (selector) => document.querySelector(selector)?.innerText?.trim() || null;
            const getAttr = (selector, attr) => document.querySelector(selector)?.getAttribute(attr) || null;

            const title = getText('.film-name.dynamic-name') || getText('.film-name');
            const altTitlesStr = getText('.alias');
            const alt_titles = altTitlesStr ? altTitlesStr.split(',').map(s => s.trim()) : [];
            const synopsis = getText('.film-description .shorting');
            const cover_url = getAttr('.film-poster-img', 'src');

            // Metadata text scraping
            // Structure is usually: .item > .item-title (Type:) ... .item-content > a
            // We can look for specific labels
            let type = 'anime';
            let status = 'ongoing';
            let release_year = null;
            let episodes_metadata = null;

            const metaItems = document.querySelectorAll('.meta .col1 .item, .meta .col2 .item');
            metaItems.forEach(item => {
                const label = item.querySelector('.item-title')?.innerText?.trim().replace(':', '');
                const content = item.querySelector('.item-content')?.innerText?.trim();

                if (!label) return;

                if (label === 'Type') {
                    type = content;
                } else if (label === 'Status') {
                    status = content;
                } else if (label === 'Date aired') {
                    // Format: "Apr 2, 2016 to Dec 24, 2016" or "Spring 2016"
                    const match = content.match(/(\d{4})/);
                    if (match) release_year = parseInt(match[1]);
                }
            });

            // Genre
            const genreNodes = document.querySelectorAll('.meta .col1 .item a[href*="/genre/"]');
            const genres = Array.from(genreNodes).map(a => a.innerText.trim());

            // Episodes
            // 9anime usually has a list of servers and episodes.
            // Selector might vary, but loosely: .episodes-ul a
            // We need to check if we are on the watch page or detail page. The provided URL is a watch page.
            // On watch page, there's usually a list of episodes in valid servers.

            // Let's try to find the episode list.
            const episodeNodes = document.querySelectorAll('.episodes-ul a');
            const episodeList = Array.from(episodeNodes).map(a => {
                const epNum = a.getAttribute('data-number');
                const epTitle = a.getAttribute('title') || a.innerText.trim();
                const epId = a.getAttribute('data-id');
                const href = a.getAttribute('href');

                return {
                    number: parseFloat(epNum),
                    title: epTitle,
                    url: href ? 'https://9animetv.to' + href : null,
                    external_id: epId
                };
            }).filter(e => !isNaN(e.number)); // Filter out bad parses

            // Deduplicate by number (sometimes multiple servers list same episodes, though usually UI separates them)
            // If the selector .episodes-ul matches multiple lists (one per server), we might get duplicates.
            // Usually 9anime loads one server's list.

            // Unique episodes
            const uniqueEpisodes = [];
            const seen = new Set();
            episodeList.forEach(ep => {
                if (!seen.has(ep.number)) {
                    seen.add(ep.number);
                    uniqueEpisodes.push(ep);
                }
            });

            return {
                title,
                alt_titles,
                synopsis,
                cover_url,
                type_raw: type,
                status_raw: status,
                release_year,
                genres,
                episodes: uniqueEpisodes
            };
        });

        return {
            ...data,
            type: mapType(data.type_raw),
            status: mapStatus(data.status_raw)
        };

    } catch (error) {
        console.error('Scraping failed:', error);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

async function getStream(episodeId) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--host-resolver-rules=MAP 9animetv.to 104.21.83.186',
                '--ignore-certificate-errors',
                '--disable-web-security'
            ]
        });
        const page = await browser.newPage();

        // Strategy: Navigate to a "dummy" watch page (or the actual one if we had the URL)
        const baseUrl = 'https://9animetv.to/watch/dummy-1?ep=' + episodeId;
        console.log(`Navigating to ${baseUrl} to setup context...`);
        // We don't need to wait for full load, just enough to be on the origin
        try {
            await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) { console.log("Navigation timeout (expected for dummy), continuing..."); }

        // Console log bridge
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));

        const streamData = await page.evaluate(async (epId) => {
            try {
                const getJSON = async (url) => {
                    console.log(`Fetching ${url}...`);
                    const res = await fetch(url, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
                    return res.json();
                };

                console.log(`Getting servers for episode ${epId}...`);
                // 1. Get List of Servers
                const serversRes = await getJSON(`/ajax/episode/servers?episodeId=${epId}`);
                if (!serversRes.html) throw new Error("No server HTML found");

                const parser = new DOMParser();
                const doc = parser.parseFromString(serversRes.html, 'text/html');

                let serverItem = doc.querySelector('.server-item[data-server-id="4"]') ||
                    doc.querySelector('.server-item[data-server-id="1"]') ||
                    doc.querySelector('.server-item');

                if (!serverItem) {
                    console.log("Servers found HTML fragment:", serversRes.html.substring(0, 100) + "...");
                    throw new Error("No suitable server found");
                }

                const serverDataId = serverItem.getAttribute('data-id');
                console.log(`Selected server data-id: ${serverDataId}`);

                // 2. Get Embed Link
                const sourcesRes = await getJSON(`/ajax/episode/sources?id=${serverDataId}`);
                if (!sourcesRes.link) throw new Error("No embed link found");

                const embedLink = sourcesRes.link;
                console.log(`Embed link: ${embedLink}`);

                // 3. Get M3U8
                const embedIdMatch = embedLink.match(/\/([^\/?]+)\?/);
                if (!embedIdMatch) throw new Error("Could not parse embed ID from link");
                const embedId = embedIdMatch[1];

                const embedUrlObj = new URL(embedLink);
                const apiUrl = `${embedUrlObj.origin}/embed-2/v2/e-1/getSources?id=${embedId}`;

                console.log(`Fetching stream from ${apiUrl} with referer ${embedLink}`);
                const streamRes = await fetch(apiUrl, {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': embedLink
                    }
                });

                if (!streamRes.ok) throw new Error(`Stream fetch failed: ${streamRes.status}`);
                return await streamRes.json();
            } catch (err) {
                console.error("Evaluation error:", err.toString());
                return { error: err.toString() };
            }
        }, episodeId);

        return streamData;

    } catch (e) {
        console.error("Stream extraction failed:", e);
        return null;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrape, getStream };
