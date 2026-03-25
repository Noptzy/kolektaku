'use strict';

require('dotenv').config();

const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin   = require('puppeteer-extra-plugin-stealth');
const dns = require('dns');
const os = require('os');
const path = require('path');
const { logger }      = require('../../config/logger');

puppeteerExtra.use(StealthPlugin());

const BASE_URL    = 'https://9animetv.to';
const SEARCH_URL  = `${BASE_URL}/filter`;

const SEL_SEARCH_CARD = '.flw-item';

const SEL_FILM_LINK   = '.film-name a';

const SEL_FILM_META   = '.fd-infor .fdi-item';

const SEL_DETAIL_TITLE = 'h2.film-name.dynamic-name';

const SEL_DETAIL_META_ITEM   = '.meta .item';
const SEL_DETAIL_ITEM_TITLE  = '.item-title';
const SEL_DETAIL_ITEM_CONTENT = '.item-content';

const USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const USE_CLOUDFLARE_DNS = !/^0|false|no$/i.test(String(process.env.USE_CLOUDFLARE_DNS || '1'));
const FORCE_CLOUDFLARE_IP_MAP = /^(1|true|yes)$/i.test(String(process.env.FORCE_CLOUDFLARE_IP_MAP || '0'));
const CHALLENGE_MAX_RETRIES = Number.parseInt(process.env.CHALLENGE_MAX_RETRIES || '3', 10);
const CHALLENGE_WAIT_MS = Number.parseInt(process.env.CHALLENGE_WAIT_MS || '20000', 10);
const SEARCH_THROTTLE_MS = Number.parseInt(process.env.SEARCH_THROTTLE_MS || '3000', 10);

function parseProxyConfig(proxyUrl) {
    if (!proxyUrl) {
        return null;
    }

    try {
        const parsed = new URL(proxyUrl);
        const protocol = parsed.protocol || 'http:';
        const server = `${protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
        const username = parsed.username ? decodeURIComponent(parsed.username) : null;
        const password = parsed.password ? decodeURIComponent(parsed.password) : null;

        return {
            server,
            auth: username ? { username, password: password || '' } : null,
        };
    } catch (error) {
        logger.warn(`[9anime] Invalid proxy URL ignored: ${error.message}`);
        return null;
    }
}

async function resolveCloudflareIp(hostname) {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(['1.1.1.1', '1.0.0.1']);
    const addresses = await resolver.resolve4(hostname);
    return Array.isArray(addresses) && addresses.length > 0 ? addresses[0] : null;
}

async function launchBrowser({ proxyUrl = null } = {}) {
    const proxyConfig = parseProxyConfig(proxyUrl);
    const siteHost = new URL(BASE_URL).hostname;
    const profileDir = path.join(os.tmpdir(), 'puppeteer-9anime-profile');
    const cloudflareIp = '172.67.180.216';
    const hostRules = `MAP ${siteHost} ${cloudflareIp}, MAP www.${siteHost} ${cloudflareIp}`;

    const launchArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--window-position=-2400,-2400',
        `--host-resolver-rules=${hostRules}`,
        '--enable-features=EncryptedClientHello',
        '--dns-over-https-mode=secure',
        '--dns-over-https-templates=https://1.1.1.1/dns-query',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        `--user-agent=${USER_AGENT}`,
        `--user-data-dir=${profileDir}`,
    ];

    if (proxyConfig?.server) {
        launchArgs.push(`--proxy-server=${proxyConfig.server}`);
    }

    const browser = await puppeteerExtra.launch({
        headless: true,
        args: launchArgs,
        ignoreHTTPSErrors: true,
    });

    browser.__proxyAuth = proxyConfig?.auth || null;

    return browser;
}


async function applyPageStealth(page, proxyAuth = null) {
    if (proxyAuth?.username) {
        await page.authenticate(proxyAuth);
    }

    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    await page.setUserAgent(USER_AGENT);

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
    });


}
function sleep(ms) {
    const jitter = Math.floor(Math.random() * 500);
    return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

function toSlug(str) {
    return (str ?? '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-{2,}/g, '-')
        .replace(/^-|-$/g, '');
}

function isProxyTunnelError(error) {
    const message = String(error?.message || '').toUpperCase();
    return (
        message.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
        message.includes('ERR_PROXY_CONNECTION_FAILED') ||
        message.includes('ERR_PROXY_CERTIFICATE_INVALID') ||
        message.includes('ERR_NO_SUPPORTED_PROXIES')
    );
}

function buildFilterUrl(keyword, pageNum) {
    const params = new URLSearchParams();
    params.set('keyword', keyword);
    params.set('type', '');
    params.set('status', 'all');
    params.set('season', '');
    params.set('language', '');
    params.set('sort', 'default');
    params.set('year', '');
    params.set('genre', '');
    if (pageNum > 1) {
        params.set('page', String(pageNum));
    }

    return `${SEARCH_URL}?${params.toString()}`;
}

async function inspectPageState(page) {
    return page.evaluate(() => {
        const bodyText = (document.body?.innerText || '').toLowerCase();
        const title = document.title || '';
        const cards = document.querySelectorAll('.flw-item').length;
        const htmlLength = document.documentElement?.outerHTML?.length || 0;
        const hostname = window.location.hostname || '';

        const hasTransportErrorText =
            bodyText.includes('this site can') ||
            bodyText.includes('err_connection') ||
            bodyText.includes('err_cert') ||
            bodyText.includes('internetbaik.telkomsel.com') ||
            bodyText.includes('privacy error');

        const hasExpectedFilterShell =
            !!document.querySelector('.block_area-filter') ||
            !!document.querySelector('.film_list-wrap');

        const relevantText = [
            document.querySelector('.film_list-wrap')?.innerText || '',
            document.querySelector('.block_area-content')?.innerText || '',
        ]
            .join(' ')
            .toLowerCase();

        const hasExplicitNoResult =
            relevantText.includes('no result') ||
            relevantText.includes('no matching') ||
            relevantText.includes('not found');

        const bodySample = bodyText.replace(/\s+/g, ' ').slice(0, 220);

        return {
            url: window.location.href,
            hostname,
            title,
            cards,
            htmlLength,
            hasTransportErrorText,
            hasExpectedFilterShell,
            hasExplicitNoResult,
            bodySample,
        };
    });
}

async function waitForSearchState(page, timeoutMs = 12000) {
    await page
        .waitForFunction(
            () => {
                const cards = document.querySelectorAll('.flw-item').length;
                const bodyText = (document.body?.innerText || '').toLowerCase();
                const hasChallenge =
                    window.location.pathname.includes('/waf-verify') ||
                    bodyText.includes('checking your browser') ||
                    bodyText.includes('just a moment') ||
                    bodyText.includes('attention required') ||
                    !!document.querySelector('iframe[src*="recaptcha"], .g-recaptcha, #cf-wrapper, .pizza');

                const hasNoResult =
                    bodyText.includes('no result') ||
                    bodyText.includes('no matching') ||
                    bodyText.includes('not found');

                return cards > 0 || hasChallenge || hasNoResult;
            },
            { timeout: timeoutMs }
        )
        .catch(() => {});
}

async function extractCardsFromPage(page) {
    return page.$$eval('.film_list-wrap .flw-item, .flw-item.item-qtip', (cards) =>
        cards.map((card) => {
            const anchor = card.querySelector('.film-name a.dynamic-name, .film-name a, .film-poster-ahref');
            const hrefRaw = anchor?.getAttribute('href') ?? '';
            const href = hrefRaw.startsWith('http') ? hrefRaw : `https://9animetv.to${hrefRaw}`;

            const watchMatch = href.match(/\/watch\/([^/?#]+)/);
            const slug = watchMatch?.[1] || '';
            const slugBase      = slug.replace(/-\d+$/, '');
            const slugParts     = slug.split('-');
            const idFromSlug    = slugParts[slugParts.length - 1] ?? '';
            const idFromData    = card.getAttribute('data-id') ?? '';
            const nineanimeId   = idFromSlug || idFromData;
            const title         = anchor?.getAttribute('title')?.trim() ?? anchor?.textContent?.trim() ?? '';
            const japaneseTitle = anchor?.dataset?.jname?.trim() ?? '';

            // Extract episode count from tick area (e.g. "Ep 12/12", "Ep Full", "Ep 4/?")
            const tickEps = card.querySelector('.tick-item.tick-eps, .tick .tick-eps');
            const episodeText = tickEps?.textContent?.trim() ?? '';

            // Extract type (TV, Movie, OVA, ONA, Special) and duration from fd-infor
            const fdiItems = card.querySelectorAll('.fd-infor .fdi-item, .film-infor .fdi-item');
            let type = '';
            let duration = '';
            fdiItems.forEach((item) => {
                const text = item.textContent?.trim() ?? '';
                if (/^(TV|Movie|OVA|ONA|Special|Music)$/i.test(text)) {
                    type = text;
                } else if (/\d+m|\d+\s*min/i.test(text)) {
                    duration = text;
                }
            });

            return { nineanimeId, slug, slugBase, title, japaneseTitle, href, episodeText, type, duration };
        })
    );
}

async function searchAnime(browser, keyword, { maxPages = 5, earlyExitScore = 0.85, scoreFn } = {}) {
    const page = await browser.newPage();
    await applyPageStealth(page, browser.__proxyAuth || null);
    const allResults = [];


    try {
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            const url = buildFilterUrl(keyword, pageNum);

            logger.debug(`[9anime] Searching page ${pageNum}: ${url}`);

            try {
                const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
                const status = response?.status?.() ?? null;
                if (status && status >= 500) {
                    throw new Error(`HTTP_${status} when fetching filter page for keyword="${keyword}"`);
                }
            } catch (error) {
                if (isProxyTunnelError(error)) throw error;
                logger.debug(`[9anime] goto timeout/error: ${error.message}. Proceeding to check selectors anyway...`);
            }

            // Tunggu load card
            await sleep(2000);
            const pageState = await inspectPageState(page);

            const isChromeErrorPage = String(pageState.url || '').startsWith('chrome-error://');
            const isUnexpectedHost = pageState.hostname && !pageState.hostname.includes('9animetv.to');

            // Hapus check retry, jika block/error log langsung error
            if (isChromeErrorPage || pageState.hasTransportErrorText || isUnexpectedHost || pageState.htmlLength < 120) {
                throw new Error(
                    `Transport block/error detected for keyword="${keyword}" (url=${pageState.url}, host=${pageState.hostname || 'n/a'}, htmlLen=${pageState.htmlLength}, body="${pageState.bodySample || 'n/a'}")`
                );
            }

            if (pageState.cards === 0 && (!pageState.hasExpectedFilterShell || !pageState.hasExplicitNoResult)) {
                throw new Error(
                    `Unexpected empty filter DOM for keyword="${keyword}" (url=${pageState.url}, title=${pageState.title || 'n/a'}, body="${pageState.bodySample || 'n/a'}")`
                );
            }

            if (pageState.cards === 0 && pageState.hasExplicitNoResult) {
                logger.debug(`[9anime] Explicit no-result state for keyword="${keyword}" on page ${pageNum}.`);
            }

            const pageResults = await extractCardsFromPage(page);
            if (pageResults.length === 0) break;

            allResults.push(...pageResults);
            logger.debug(`[9anime] Page ${pageNum}: ${pageResults.length} result(s) (total: ${allResults.length})`);

            if (scoreFn) {
                const topScore = scoreFn(allResults);
                if (topScore >= earlyExitScore) {
                    logger.debug(`[9anime] Early exit at page ${pageNum} — top score ${topScore.toFixed(3)}`);
                    break;
                }
            }

            const hasNext = await page.$('.ap__-btn-next a:not(.disabled)');
            if (!hasNext) break;

            await sleep(SEARCH_THROTTLE_MS);
        }
    } catch (error) {
        if (isProxyTunnelError(error)) {
            throw error;
        }

        if (allResults.length === 0) {
            throw error;
        }

        logger.error(`[9anime] searchAnime error for keyword="${keyword}": ${error.message}`);
    } finally {
        await page.close();
    }

    logger.debug(`[9anime] Total results for keyword="${keyword}": ${allResults.length}`);
    return allResults;
}

async function getAnimeDetail(browser, slug) {
    const url  = `${BASE_URL}/watch/${slug}`;
    const page = await browser.newPage();
    await applyPageStealth(page, browser.__proxyAuth || null);


    try {
        logger.debug(`[9anime] Fetching detail: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });

        await page.waitForSelector('.meta .item', { timeout: 30_000 }).catch(() => {
        });

        const detail = await page.evaluate((selDetailTitle, selMetaItem, selItemTitle, selItemContent) => {
            const titleEl = document.querySelector(selDetailTitle);
            const title   = titleEl?.textContent?.trim() ?? '';

            const meta    = {};
            document.querySelectorAll(selMetaItem).forEach((item) => {
                const key   = item.querySelector(selItemTitle)?.textContent?.replace(':', '').trim().toLowerCase() ?? '';
                const value = item.querySelector(selItemContent)?.textContent?.trim() ?? '';
                if (key) meta[key] = value;
            });

            let year = null;
            const dateAired  = meta['date aired'] ?? '';
            const premiered  = meta['premiered']  ?? '';

            const dateMatch  = dateAired.match(/\d{4}/);
            const premMatch  = premiered.match(/\d{4}/);

            if (dateMatch)       year = parseInt(dateMatch[0], 10);
            else if (premMatch)  year = parseInt(premMatch[0], 10);

            return {
                title,
                type:      meta['type']      ?? '',
                status:    meta['status']    ?? '',
                premiered: meta['premiered'] ?? '',
                year,
            };
        }, SEL_DETAIL_TITLE, SEL_DETAIL_META_ITEM, SEL_DETAIL_ITEM_TITLE, SEL_DETAIL_ITEM_CONTENT);

        const slugParts   = slug.split('-');
        const nineanimeId = slugParts[slugParts.length - 1] ?? '';

        return { nineanimeId, slug, ...detail };
    } catch (error) {
        logger.error(`[9anime] getAnimeDetail error for slug="${slug}": ${error.message}`);
        return null;
    } finally {
        await page.close();
    }
}

async function navigateStable(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 }).catch(() => {});
    await sleep(2000);
}

async function getEpisodeList(browser, nineanimeId) {
    const page = await browser.newPage();
    await applyPageStealth(page, browser.__proxyAuth || null);

    try {
        const response = await navigateStable(page, `${BASE_URL}/watch/a-${nineanimeId}`);
        const finalUrl = page.url();
        const urlToUse = finalUrl.includes('/watch/') ? finalUrl.split('?')[0] : `${BASE_URL}/watch/a-${nineanimeId}`;

        try {
            await page.waitForSelector('.ep-item', { timeout: 30_000 });
        } catch (e) {
            logger.warn(`[9anime] No .ep-item found for ID=${nineanimeId} after 30s. Final URL: ${finalUrl}`);
            return [];
        }

        const episodes = await page.evaluate((baseUrl) => {
            const anchors = document.querySelectorAll('.ep-item');
            return Array.from(anchors).map(a => {
                const epId = a.getAttribute('data-id') ?? '';
                return {
                    episodeNumber: parseFloat(a.getAttribute('data-number') ?? '0'),
                    title:         a.getAttribute('title')?.trim() || `Episode ${a.getAttribute('data-number')}`,
                    nineanimeEpId: epId,
                    url:           `${baseUrl}?ep=${epId}`,
                    hasSub:        a.getAttribute('data-sub') === '1' || !!a.querySelector('.ep-sub'),
                    hasDub:        a.getAttribute('data-dub') === '1' || !!a.querySelector('.ep-dub'),
                };
            }).filter(e => !isNaN(e.episodeNumber) && e.nineanimeEpId);
        }, urlToUse);

        logger.debug(`[9anime] Episode list for ID=${nineanimeId}: ${episodes.length} episode(s)`);
        return episodes;
    } catch (error) {
        logger.error(`[9anime] getEpisodeList error for nineanimeId="${nineanimeId}": ${error.message}`);
        return [];
    } finally {
        await page.close();
    }
}

module.exports = {
    launchBrowser,
    searchAnime,
    getAnimeDetail,
    getEpisodeList,
    sleep,
    toSlug,
};
