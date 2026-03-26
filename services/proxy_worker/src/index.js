const ALLOWED_ORIGINS = [
  "https://kolektaku.biz.id",
  "https://www.kolektaku.biz.id",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

// ── CDN Referer Mapping ──────────────────────────────────────────────────────
const CDN_REFERER_MAP = [
  { pattern: /rapid-cloud\.co|rabbitstream\.net/, referer: "https://rapid-cloud.co/" },
  { pattern: /megacloud\.tv|megacloud\.blog/, referer: "https://megacloud.tv/" },
  { pattern: /bunnycdn|cloudflarestorage/, referer: "https://megacloud.tv/" },
  // Dynamic CDN hostnames (stormshade84.live, sunburst93.live, clearskyline88.online, etc.)
  { pattern: /\w+\d+\.(live|online|xyz)/, referer: "https://rapid-cloud.co/" },
];

function getRefererForUrl(url) {
  for (const { pattern, referer } of CDN_REFERER_MAP) {
    if (pattern.test(url)) return referer;
  }
  return "https://rapid-cloud.co/";
}

const BASE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
  "Sec-Ch-Ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

function getCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range, If-Modified-Since",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type, Accept-Ranges",
  };
}

// ── Translation ──────────────────────────────────────────────────────────────

function applyInformalStyle(text) {
  return text
    .replace(/\bSaya\b/gi, "Aku")
    .replace(/\bAnda\b/gi, "Kamu")
    .replace(/\bKami\b/gi, "Kita")
    .replace(/\bApakah\b/gi, "Apa")
    .replace(/\bBagaimana\b/gi, "Gimana")
    .replace(/\bMengapa\b/gi, "Kenapa")
    .replace(/\bTidak\b/gi, "Gak")
    .replace(/\bTetapi\b/gi, "Tapi")
    .replace(/\bNamun\b/gi, "Tapi")
    .replace(/\bKemudian\b/gi, "Terus")
    .replace(/\bKarena\b/gi, "Soalnya")
    .replace(/\bSangat\b/gi, "Banget")
    .replace(/\bSudah\b/gi, "Udah")
    .replace(/\bHanya\b/gi, "Cuma")
    .replace(/\bSaja\b/gi, "Aja")
    .replace(/\bSeperti\b/gi, "Kayak");
}

async function translateWithGoogle(text, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Google ${res.status}`);
  const data = await res.json();
  return data[0].map((s) => s[0]).join("");
}

async function translateWithMyMemory(text, from, to) {
  const MAX = 490;
  const chunks = [];
  const lines = text.split("\n");
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > MAX && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${from}|${to}`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
      );
      if (!res.ok) throw new Error(`MyMemory ${res.status}`);
      const data = await res.json();
      return data.responseData.translatedText;
    }),
  );
  return results.join("\n");
}

async function handleTranslate(request, corsHeaders) {
  const body = await request.json();
  const { text, from = "en", to = "id" } = body;
  if (!text) return new Response("Text is required", { status: 400, headers: corsHeaders });

  const engines = [
    () => translateWithGoogle(text, to),
    () => translateWithMyMemory(text, from, to),
  ];

  for (const engine of engines) {
    try {
      let translated = await engine();
      if (to === "id" && translated) translated = applyInformalStyle(translated);
      return Response.json({ text: translated }, { headers: corsHeaders });
    } catch {
      // try next engine
    }
  }

  return new Response("All translation engines failed", { status: 500, headers: corsHeaders });
}

// ── Proxy ────────────────────────────────────────────────────────────────────

async function handleProxy(searchParams, corsHeaders) {
  const targetUrl = searchParams.get("url");
  if (!targetUrl) {
    return new Response("Missing ?url= parameter", { status: 400, headers: corsHeaders });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return new Response("Invalid URL", { status: 400, headers: corsHeaders });
  }

  const blockedPatterns = [/^localhost$/i, /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./];
  if (parsedUrl.protocol !== "https:" || blockedPatterns.some((r) => r.test(parsedUrl.hostname))) {
    return new Response("Domain not allowed", { status: 403, headers: corsHeaders });
  }

  // Smart referer: client override > CDN map > default rapid-cloud
  const refererParam = searchParams.get("referer");
  const autoReferer = getRefererForUrl(targetUrl);
  const finalReferer = refererParam || autoReferer;
  const spoofHeaders = {
    ...BASE_HEADERS,
    Referer: finalReferer,
    Origin: new URL(finalReferer).origin,
  };

  const upstream = await fetch(targetUrl, {
    headers: spoofHeaders,
    cf: {
      cacheTtl: targetUrl.includes(".ts") ? 3600 : 60,
      cacheEverything: true,
    },
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`Upstream error: ${upstream.status}`, {
      status: upstream.status,
      headers: corsHeaders,
    });
  }

  const responseHeaders = new Headers(corsHeaders);
  for (const h of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"]) {
    const val = upstream.headers.get(h);
    if (val) responseHeaders.set(h, val);
  }
  responseHeaders.set(
    "Cache-Control",
    targetUrl.includes(".ts") ? "public, max-age=3600" : "public, max-age=60",
  );

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default {
  async fetch(request) {
    const { pathname, searchParams } = new URL(request.url);
    const requestOrigin = request.headers.get("Origin") || "";
    const corsHeaders = getCorsHeaders(requestOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      if (pathname === "/translate-google" && request.method === "POST") {
        return handleTranslate(request, corsHeaders);
      }

      if (pathname === "/proxy" && request.method === "GET") {
        return handleProxy(searchParams, corsHeaders);
      }

      return new Response("Not found", { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(`Worker error: ${err.message}`, { status: 502, headers: corsHeaders });
    }
  },
};
