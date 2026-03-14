const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const { logger } = require("../../config/logger");

puppeteer.use(StealthPlugin());

async function scrapeStream(url, workerId) {
  logger.info(`Puppeteer launching for URL: ${url}`, { worker: workerId });

  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--host-resolver-rules=MAP 9animetv.to 104.21.83.186",
    "--ignore-certificate-errors",
    "--disable-web-security",
  ];

  if (process.env.PROXY_URL) {
    args.push(`--proxy-server=${process.env.PROXY_URL}`);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: args,
    channel: "chrome", // Cari chrome lokal
  });

  const page = await browser.newPage();
  const urlObj = new URL(url);
  const episodeId = urlObj.searchParams.get("ep");

  if (!episodeId) {
    await browser.close();
    throw new Error("Episode ID tidak ditemukan di URL");
  }

  return new Promise(async (resolve, reject) => {
    try {
      // Sesuai dengan instruksi user: bypass load dengan navigasi ke dummy page
      const baseUrl = `https://9animetv.to/watch/dummy-1?ep=${episodeId}`;
      logger.info(`Navigating to dummy page to setup context: ${baseUrl}`, {
        worker: workerId,
      });

      try {
        await page.goto(baseUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
      } catch (e) {
        logger.warn(`Navigation timeout (expected for dummy), continuing...`, {
          worker: workerId,
        });
      }

      page.on("console", (msg) =>
        logger.info(`PAGE LOG: ${msg.text()}`, { worker: workerId }),
      );

      const streamData = await page.evaluate(async (epId) => {
        try {
          const getJSON = async (fetchUrl) => {
            console.log(`Fetching ${fetchUrl}...`);
            const res = await fetch(fetchUrl, {
              headers: { "X-Requested-With": "XMLHttpRequest" },
            });
            if (!res.ok)
              throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
            return res.json();
          };

          console.log(`Getting servers for episode ${epId}...`);
          // 1. Get List of Servers
          const serversRes = await getJSON(
            `/ajax/episode/servers?episodeId=${epId}`,
          );
          if (!serversRes.html) throw new Error("No server HTML found");

          const parser = new DOMParser();
          const doc = parser.parseFromString(serversRes.html, "text/html");

          let serverItem =
            doc.querySelector('.server-item[data-server-id="4"]') ||
            doc.querySelector('.server-item[data-server-id="1"]') ||
            doc.querySelector(".server-item");

          if (!serverItem) {
            console.log(
              "Servers found HTML fragment:",
              serversRes.html.substring(0, 100) + "...",
            );
            throw new Error("No suitable server found");
          }

          const serverDataId = serverItem.getAttribute("data-id");
          console.log(`Selected server data-id: ${serverDataId}`);

          // 2. Get Embed Link
          const sourcesRes = await getJSON(
            `/ajax/episode/sources?id=${serverDataId}`,
          );
          if (!sourcesRes.link) throw new Error("No embed link found");

          const embedLink = sourcesRes.link;
          console.log(`Embed link: ${embedLink}`);

          // 3. Get M3U8
          const embedUrlObjOriginal = new URL(embedLink);
          const pathParts = embedUrlObjOriginal.pathname.split("/");
          const embedId = pathParts[pathParts.length - 1];

          const embedUrlObj = new URL(embedLink);
          const apiUrl = `${embedUrlObj.origin}/embed-2/v2/e-1/getSources?id=${embedId}`;

          console.log(
            `Fetching stream from ${apiUrl} with referer ${embedLink}`,
          );
          const streamRes = await fetch(apiUrl, {
            headers: {
              "X-Requested-With": "XMLHttpRequest",
              Referer: embedLink,
            },
          });

          if (!streamRes.ok)
            throw new Error(`Stream fetch failed: ${streamRes.status}`);
          return await streamRes.json();
        } catch (err) {
          console.error("Evaluation error:", err.toString());
          return { error: err.toString() };
        }
      }, episodeId);

      await browser.close();

      if (streamData.error) {
        reject(new Error(`Puppeteer extraction failed: ${streamData.error}`));
      } else {
        logger.info(`Puppeteer extraction SUCCESS.`, { worker: workerId });
        resolve(streamData);
      }
    } catch (error) {
      await browser.close();
      reject(new Error(`Puppeteer Error: ${error.message}`));
    }
  });
}

module.exports = { scrapeStream };
