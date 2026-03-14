const axios = require("axios");
const cheerio = require("cheerio");
const dns = require("dns");
const https = require("https");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { logger } = require("../../config/logger");
const queueManager = require("./queueManager");
const net = require("net");

// Cache DNS hasil DoH supaya tidak lookup setiap request
const dnsCache = new Map();

/**
 * DNS-over-HTTPS (DoH) resolver pakai Cloudflare HTTPS endpoint.
 */
async function resolveViaDoH(hostname) {
  if (dnsCache.has(hostname)) {
    return dnsCache.get(hostname);
  }

  try {
    const dohRes = await axios.get("https://cloudflare-dns.com/dns-query", {
      params: { name: hostname, type: "A" },
      headers: { Accept: "application/dns-json" },
      timeout: 3000,
    });
    const answer = dohRes.data?.Answer?.find((r) => r.type === 1); // type 1 = A record
    if (answer?.data) {
      logger.info(`[DoH] ${hostname} → ${answer.data}`);
      dnsCache.set(hostname, answer.data);
      return answer.data;
    }
  } catch (_) {
    // DoH gagal
  }
  return null;
}

const dohLookup = (hostname, opts, callback) => {
  const isAll = typeof opts === "object" && opts.all === true;

  if (!hostname || net.isIP(hostname)) {
    const ip = hostname || "127.0.0.1";
    const family = net.isIP(ip) || 4;
    return isAll
      ? callback(null, [{ address: ip, family }])
      : callback(null, ip, family);
  }

  resolveViaDoH(hostname)
    .then((ip) => {
      if (ip) {
        return isAll
          ? callback(null, [{ address: ip, family: 4 }])
          : callback(null, ip, 4);
      }
      dns.lookup(hostname, opts, callback);
    })
    .catch(() => dns.lookup(hostname, opts, callback));
};

const proxyUrl = process.env.PROXY_URL;
let agentOptions;

if (proxyUrl) {
  agentOptions = new HttpsProxyAgent(proxyUrl);
  logger.info(`Using proxy: ${proxyUrl}`);
} else {
  agentOptions = new https.Agent({
    lookup: dohLookup,
    keepAlive: true,
    keepAliveMsecs: 10000,
    maxSockets: 10,
    timeout: 8000,
  });
}

const axiosClient = axios.create({
  httpsAgent: agentOptions,
  timeout: 10000,
});

async function resolveEpisode(url, workerId) {
  logger.info(`Resolver started for URL: ${url}`, { worker: workerId });

  const urlObj = new URL(url);
  const episodeId = urlObj.searchParams.get("ep");

  if (!episodeId) {
    throw new Error("Episode ID tidak ditemukan di URL");
  }

  const startTime = Date.now();

  try {
    logger.info(`Attempting fast HTTP fetch for episode ${episodeId}...`, {
      worker: workerId,
    });

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: url,
    };

    const serversRes = await axiosClient.get(
      `https://9animetv.to/ajax/episode/servers?episodeId=${episodeId}`,
      { headers },
    );
    const html = serversRes.data?.html;

    if (!html)
      throw new Error(
        `Gagal mendapatkan HTML servers. Status: ${serversRes.data?.status}`,
      );

    const $ = cheerio.load(html);

    let serverItem = $('.server-item[data-server-id="4"]').first();
    if (!serverItem.length)
      serverItem = $('.server-item[data-server-id="1"]').first();
    if (!serverItem.length) serverItem = $(".server-item").first();

    if (!serverItem.length) {
      throw new Error(
        "Tidak dapat menemukan elemen server-item di dalam HTML servers",
      );
    }

    const sourceId = serverItem.attr("data-id");
    logger.info(`Selected server data-id: ${sourceId}`, { worker: workerId });

    const sourcesRes = await axiosClient.get(
      `https://9animetv.to/ajax/episode/sources?id=${sourceId}`,
      { headers },
    );
    const link = sourcesRes.data.link;

    if (!link)
      throw new Error(
        "Gagal mendapatkan iframe link dari ajax/episode/sources",
      );

    const linkUrl = new URL(link);
    const pathParts = linkUrl.pathname.split("/");
    const rapidCloudId = pathParts[pathParts.length - 1];

    if (!rapidCloudId)
      throw new Error(`Gagal mengekstrak RapidCloud ID dari link: ${link}`);

    const finalRes = await axiosClient
      .get(
        `https://rapid-cloud.co/embed-2/v2/e-1/getSources?id=${rapidCloudId}`,
        {
          headers: { ...headers, Referer: link },
        },
      )
      .catch(async () => {
        return await axiosClient.get(
          `https://rapid-cloud.co/ajax/embed-6-v2/getSources?id=${rapidCloudId}`,
          {
            headers: { ...headers, Referer: link },
          },
        );
      });

    const endTime = Date.now();
    logger.info(
      `FINISHED resolving via HTTP FETCH in ${(endTime - startTime) / 1000}s.`,
      { worker: workerId },
    );

    return {
      source: "fetch",
      data: finalRes.data,
    };
  } catch (error) {
    logger.warn(
      `Fast HTTP fetch failed: ${error.message}. Falling back to Puppeteer...`,
      { worker: workerId },
    );

    try {
      const puppeteerData = await queueManager.addJob({ url, workerId });
      return { source: "puppeteer", data: puppeteerData };
    } catch (queueError) {
      logger.error(`Puppeteer fallback also failed: ${queueError.message}`, {
        worker: workerId,
      });
      throw queueError;
    }
  }
}

module.exports = { resolveEpisode };
