const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const logger = require("../utils/logger");


const proxyUrl = process.env.PROXY_URL;
let httpsAgent;

if (proxyUrl) {
  httpsAgent = new HttpsProxyAgent(proxyUrl);
  logger.info(`Using proxy for stream resolver: ${proxyUrl}`);
}

const axiosClient = axios.create({
  httpsAgent,
});

async function resolveStream(url, workerId) {
  logger.info(`STARTED resolving url: ${url}`, { worker: workerId });

  try {
    const urlObj = new URL(url);
    const episodeId = urlObj.searchParams.get("ep");

    if (!episodeId) {
      throw new Error("Episode ID tidak ditemukan di URL");
    }

    logger.info(`Fetching servers for episode ${episodeId}...`, {
      worker: workerId,
    });

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "*/*, application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
      Referer: url,
    };

    const serversRes = await axiosClient.get(
      `https://9animetv.to/ajax/episode/servers?episodeId=${episodeId}`,
      { headers },
    );
    const html = serversRes.data.html;

    if (!html) {
      throw new Error("Gagal mendapatkan HTML servers dari 9animetv.");
    }

    let sourceId;
    const subMatch = html.match(/data-type="sub"\\s+data-id="(\\d+)"/);

    if (subMatch && subMatch[1]) {
      sourceId = subMatch[1];
    } else {
      const anyMatch = html.match(/data-id="(\\d+)"/);
      if (anyMatch && anyMatch[1]) {
        sourceId = anyMatch[1];
      }
    }

    if (!sourceId) {
      throw new Error(
        "Tidak dapat menemukan sourceId (data-id) di dalam HTML servers",
      );
    }

    logger.info(`Found sourceId: ${sourceId}. Fetching iframe link...`, {
      worker: workerId,
    });

    const sourcesRes = await axiosClient.get(
      `https://9animetv.to/ajax/episode/sources?id=${sourceId}`,
      { headers },
    );
    const link = sourcesRes.data.link;

    if (!link) {
      throw new Error(
        "Gagal mendapatkan iframe link dari ajax/episode/sources",
      );
    }

    const linkUrl = new URL(link);
    const pathParts = linkUrl.pathname.split("/");
    const rapidCloudId = pathParts[pathParts.length - 1];

    if (!rapidCloudId) {
      throw new Error(`Gagal mengekstrak RapidCloud ID dari link: ${link}`);
    }

    logger.info(
      `Extracted RapidCloud ID: ${rapidCloudId}. Fetching final stream...`,
      { worker: workerId },
    );

    const finalRes = await axiosClient
      .get(
        `https://rapid-cloud.co/ajax/embed-6-v2/getSources?id=${rapidCloudId}`,
        {
          headers: {
            ...headers,
            Referer: link,
          },
        },
      )
      .catch(async (err) => {
        logger.warn(
          `Peringatan rute default gagal: ${err.message}. Mencoba rute url dari instruksi...`,
          { worker: workerId },
        );
        return await axiosClient.get(
          `https://rapid-cloud.co/embed-2/v2/e-1/getSources?id=${rapidCloudId}`,
          {
            headers: { ...headers, Referer: link },
          },
        );
      });

    logger.info(`FINISHED resolving. Successfully extracted m3u8.`, {
      worker: workerId,
    });

    return finalRes.data;
  } catch (error) {
    logger.error(`Error resolving stream: ${error.message}`, {
      worker: workerId,
    });
    throw error;
  }
}

module.exports = { resolveStream };
