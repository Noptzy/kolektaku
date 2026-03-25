import { NextResponse } from "next/server";
import axios from "axios";
import { HttpsProxyAgent } from "https-proxy-agent";

let cachedFreeProxies = [];
let lastFetch = 0;

async function getFreeProxies() {
  const now = Date.now();
  // Fetch ulang setiap 10 menit jika list ampas
  if (cachedFreeProxies.length > 100 && now - lastFetch < 10 * 60 * 100)
    return cachedFreeProxies;

  try {
    const sources = [
      "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
      "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
      "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
      "https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt",
      "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
      "https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt",
      "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
      "https://raw.githubusercontent.com/sunny9577/proxy-scraper/master/proxies.txt"
    ];

    console.log("[Proxy] Fetching expanded free proxies...");
    const results = await Promise.allSettled(
      sources.map((s) => axios.get(s, { timeout: 8000 })),
    );
    
    let all = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && typeof r.value.data === "string") {
        const lines = r.value.data
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => /^\d+\.\d+\.\d+\.\d+:\d+$/.test(l));
        all.push(...lines.map((l) => `http://${l}`));
      }
    });

    cachedFreeProxies = [...new Set(all)];
    lastFetch = now;
    console.log(`[Proxy] Loaded ${cachedFreeProxies.length} free proxies`);
    return cachedFreeProxies;
  } catch (e) {
    return cachedFreeProxies;
  }
}

async function tryFetch(url, proxy, timeout = 12000) {
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;

  const res = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: timeout,
    httpsAgent: agent,
    proxy: false,
    headers: {
      Referer: "https://rapid-cloud.co/",
      Origin: "https://rapid-cloud.co",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Sec-Ch-Ua":
        '"Chromium";v="144", "Not-A.Brand";v="24", "Google Chrome";v="144"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
    },
  });

  const contentType = res.headers["content-type"] || "";
  if (contentType.includes("text/html") && res.data.length < 10000) {
    throw new Error("Cloudflare Blocked");
  }

  return res;
}

function getStickyProxies(url, allProxies, count = 40) {
  if (allProxies.length === 0) return [];
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    pathParts.pop(); // Folder path only
    const stickyKey = urlObj.hostname + pathParts.join("/");

    let hash = 0;
    for (let i = 0; i < stickyKey.length; i++) {
      hash = (hash << 5) - hash + stickyKey.charCodeAt(i);
      hash |= 0;
    }

    const startIndex = Math.abs(hash) % allProxies.length;
    const selected = [];
    for (let i = 0; i < count; i++) {
      selected.push(allProxies[(startIndex + i) % allProxies.length]);
    }
    return selected;
  } catch (e) {
    return allProxies.slice(0, count);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new NextResponse("URL is required", { status: 400 });

  try {
    const freeProxies = await getFreeProxies();
    
    // Gunakan Sticky Logic: Segmen video yang sama dapet pool proxy yang sama
    const candidates = getStickyProxies(url, freeProxies, 40);

    console.log(`[Proxy] Racing 40 sticky free proxies for: ${url.substring(0, 50)}...`);
    const winner = await Promise.any(
      candidates.map((p) => tryFetch(url, p, 15000)),
    );

    const responseHeaders = new Headers();
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    let data = winner.data;
    const contentType = winner.headers["content-type"];
    if (contentType) responseHeaders.set("Content-Type", contentType);

    // M3U8 Rewriting: Biar segmen video selanjutnya tetep lewat proxy kita
    if (
      url.includes(".m3u8") &&
      (contentType.includes("application/vnd.apple.mpegurl") ||
        contentType.includes("text/plain"))
    ) {
      let content = Buffer.from(data).toString();
      const baseUrl =
        new URL(url).origin +
        new URL(url).pathname.split("/").slice(0, -1).join("/") +
        "/";

      const lines = content.split("\n").map((line) => {
        if (line.trim() && !line.startsWith("#")) {
          let segmentUrl = line.trim();
          if (!segmentUrl.startsWith("http")) {
            segmentUrl = new URL(segmentUrl, baseUrl).toString();
          }
          return `${origin}/proxy?url=${encodeURIComponent(segmentUrl)}`;
        }
        return line;
      });
      data = Buffer.from(lines.join("\n"));
      responseHeaders.set("Content-Length", data.length.toString());
    }

    if (url.includes(".ts") || url.includes(".m3u8") || url.includes(".js")) {
      responseHeaders.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=3600",
      );
    }

    return new NextResponse(data, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[Proxy Error] 40 free proxies failed for ${url}`);
    return new NextResponse("All free proxies blocked. Try again.", {
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
