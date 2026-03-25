import express from "express";
import cors from "cors";
import axios from "axios";
import { translate } from "@vitalets/google-translate-api";
import { translate as bingTranslate } from "bing-translate-api";
import { HttpsProxyAgent } from "https-proxy-agent";
import NodeCache from "node-cache";

const app = express();
const PORT = 3002;

// --- Global error handlers: prevent server from crashing on unhandled errors ---
process.on("uncaughtException", (err) => {
  console.error("⚠️  Uncaught Exception (server kept alive):", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error(
    "⚠️  Unhandled Rejection (server kept alive):",
    reason?.message || reason,
  );
});

app.use(cors());
app.use(express.json());

const translationCache = new NodeCache({ stdTTL: 86400 }); // Cache for 24 hours

// --- Proxy Rotation Setup ---
let proxyList = [];
let currentProxyIndex = 0;
let proxyEnabled = false;
let proxyReadyResolve;
let proxyReadyPromise = new Promise((resolve) => {
  proxyReadyResolve = resolve;
});

function getNextProxy() {
  if (!proxyEnabled || proxyList.length === 0) return null;
  const proxy = proxyList[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxyList.length;
  return proxy;
}

function createAgent() {
  const proxy = getNextProxy();
  if (!proxy) return undefined;
  console.log(`Using proxy: ${proxy}`);
  return new HttpsProxyAgent(proxy);
}

// Auto-fetch free proxies from public APIs
async function fetchFreeProxies() {
  console.log("🔍 Fetching free proxies...");
  const sources = [
    "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=5000&country=&ssl=yes&anonymity=all",
    "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
    "https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt",
  ];

  let allProxies = [];

  for (const url of sources) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const lines = response.data
        .split("\n")
        .filter((l) => l.trim().match(/^\d+\.\d+\.\d+\.\d+:\d+$/));
      const formatted = lines.map((l) => `http://${l.trim()}`);
      allProxies.push(...formatted);
      console.log(
        `  📋 Got ${formatted.length} proxies from ${url.substring(0, 50)}...`,
      );
    } catch (e) {
      console.warn(
        `  ⚠️ Failed to fetch from ${url.substring(0, 50)}...: ${e.message}`,
      );
    }
  }

  // Deduplicate
  allProxies = [...new Set(allProxies)];
  console.log(`📊 Total unique proxies fetched: ${allProxies.length}`);
  return allProxies;
}

// Test a proxy by attempting a small translation
async function testProxy(proxyUrl, timeoutMs = 8000) {
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const result = await translate("hello", {
      client: "gtx",
      to: "id",
      fetchOptions: { agent, signal: controller.signal },
    });

    clearTimeout(timer);

    if (result && result.text) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Fetch and test proxies, keeping only working ones
async function loadWorkingProxies(maxToTest = 30, maxWorking = 5) {
  const allProxies = await fetchFreeProxies();
  if (allProxies.length === 0) {
    console.log("❌ No proxies found from any source.");
    return;
  }

  // Shuffle to get random ones
  const shuffled = allProxies.sort(() => Math.random() - 0.5);
  const toTest = shuffled.slice(0, maxToTest);

  console.log(
    `🧪 Testing ${toTest.length} proxies (looking for ${maxWorking} working)...`,
  );
  const working = [];

  // Test in parallel batches of 5
  for (let i = 0; i < toTest.length && working.length < maxWorking; i += 5) {
    const batch = toTest.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async (proxy) => {
        const ok = await testProxy(proxy);
        if (ok) console.log(`  ✅ Working: ${proxy}`);
        return { proxy, ok };
      }),
    );
    results.filter((r) => r.ok).forEach((r) => working.push(r.proxy));
  }

  if (working.length > 0) {
    proxyList = working;
    currentProxyIndex = 0;
    proxyEnabled = true;
    console.log(`🎉 Loaded ${working.length} working proxies!`);
  } else {
    console.log("😞 No working proxies found. Will use direct connection.");
    proxyEnabled = false;
  }

  // Signal that proxy discovery is complete
  if (proxyReadyResolve) proxyReadyResolve();
}

// API to update proxy list dynamically
app.post("/set-proxies", (req, res) => {
  const { proxies } = req.body;
  if (!Array.isArray(proxies))
    return res.status(400).json({ error: "proxies must be an array" });
  proxyList = proxies;
  currentProxyIndex = 0;
  proxyEnabled = proxyList.length > 0;
  console.log(
    `Proxy list updated: ${proxyList.length} proxies. Enabled: ${proxyEnabled}`,
  );
  res.json({
    message: `${proxyList.length} proxies loaded`,
    enabled: proxyEnabled,
  });
});

// API to manually refresh proxies
app.get("/fetch-proxies", async (req, res) => {
  await loadWorkingProxies();
  res.json({
    enabled: proxyEnabled,
    count: proxyList.length,
    proxies: proxyList,
  });
});

// API to check proxy status
app.get("/proxy-status", (req, res) => {
  res.json({
    enabled: proxyEnabled,
    count: proxyList.length,
    proxies: proxyList,
    current: proxyEnabled ? proxyList[currentProxyIndex] : null,
  });
});

function applyInformalStyle(text) {
  if (!text) return text;
  let styled = text;

  // Pronouns (Kata Ganti)
  styled = styled.replace(/\bSaya\b/gi, "Aku");
  styled = styled.replace(/\bAnda\b/gi, "Kamu");
  styled = styled.replace(/\bKalian\b/gi, "Kalian"); // Already informal
  styled = styled.replace(/\bKami\b/gi, "Kita");
  styled = styled.replace(/\bBeliau\b/gi, "Dia");

  // Question words (Kata Tanya)
  styled = styled.replace(/\bApakah\b/gi, "Apa");
  styled = styled.replace(/\bBagaimana\b/gi, "Gimana");
  styled = styled.replace(/\bMengapa\b/gi, "Kenapa");
  styled = styled.replace(/\bDi mana\b/gi, "Dimana");
  styled = styled.replace(/\bKe mana\b/gi, "Kemana");
  styled = styled.replace(/\bDari mana\b/gi, "Darimana");

  // Negations (Kata Negasi)
  styled = styled.replace(/\bTidak\b/gi, "gak");
  styled = styled.replace(/\bTidak ada\b/gi, "Gak ada");
  styled = styled.replace(/\bBelum\b/gi, "Belom");
  styled = styled.replace(/\bJangan\b/gi, "Jangan"); // Already informal

  // Conjunctions (Kata Hubung)
  styled = styled.replace(/\bTetapi\b/gi, "Tapi");
  styled = styled.replace(/\bNamun\b/gi, "Tapi");
  styled = styled.replace(/\bKemudian\b/gi, "Terus");
  styled = styled.replace(/\bLalu\b/gi, "Terus");
  styled = styled.replace(/\bKarena\b/gi, "Soalnya");
  styled = styled.replace(/\bSebab\b/gi, "Soalnya");

  // Adverbs & Modifiers (Kata Keterangan)
  styled = styled.replace(/\bSangat\b/gi, "Banget");
  styled = styled.replace(/\bAmat\b/gi, "Banget");
  styled = styled.replace(/\bBenar\b/gi, "Bener");
  styled = styled.replace(/\bSedang\b/gi, "Lagi");
  styled = styled.replace(/\bHanya\b/gi, "Cuma");
  styled = styled.replace(/\bSaja\b/gi, "Aja");
  styled = styled.replace(/\bMasih\b/gi, "Masih"); // Keep as is
  styled = styled.replace(/\bSudah\b/gi, "Udah");
  styled = styled.replace(/\bBelum\b/gi, "Belom");

  // Verbs (Kata Kerja - common ones)
  styled = styled.replace(/\bMengatakan\b/gi, "Bilang");
  styled = styled.replace(/\bBerkata\b/gi, "Bilang");
  styled = styled.replace(/\bMemberitahu\b/gi, "Kasih tau");
  styled = styled.replace(/\bMengetahui\b/gi, "Tau");
  styled = styled.replace(/\bMelihat\b/gi, "Liat");
  styled = styled.replace(/\bMemakan\b/gi, "Makan");
  styled = styled.replace(/\bMeminum\b/gi, "Minum");
  styled = styled.replace(/\bMengambil\b/gi, "Ambil");

  // Common phrases
  styled = styled.replace(/\bSeperti apa\b/gi, "Kayak gimana");
  styled = styled.replace(/\bSeperti\b/gi, "Kayak");
  styled = styled.replace(/\bTerima kasih\b/gi, "Makasih");
  styled = styled.replace(/\bMaaf\b/gi, "Maaf"); // Keep as is
  styled = styled.replace(/\bSilakan\b/gi, "Silakan"); // Keep as is
  styled = styled.replace(/\bTolong\b/gi, "Tolong"); // Keep as is

  // Remove excessive formality markers
  styled = styled.replace(/\bdengan hormat\b/gi, "");
  styled = styled.replace(/\byang terhormat\b/gi, "");

  return styled;
}

// --- Translation Engines ---

// Engine: Google Translate via PROXY (tries ALL proxies)
async function translateWithGoogleProxy(text, from, to) {
  if (!proxyEnabled || proxyList.length === 0) {
    throw new Error("No proxies available");
  }

  let lastErr;
  for (let i = 0; i < proxyList.length; i++) {
    const proxy = proxyList[currentProxyIndex % proxyList.length];
    currentProxyIndex++;

    try {
      const agent = new HttpsProxyAgent(proxy);
      const result = await translate(text, {
        client: "gtx",
        to: to || "id",
        fetchOptions: { agent },
      });
      return result.text;
    } catch (err) {
      console.warn(`  Proxy ${proxy} failed: ${err.message?.substring(0, 50)}`);
      lastErr = err;
    }
  }
  throw lastErr || new Error("All proxies failed");
}

// Engine: Google Translate DIRECT (no proxy)
async function translateWithGoogleDirect(text, from, to) {
  const result = await translate(text, { client: "gtx", to: to || "id" });
  return result.text;
}

// Engine: Bing Translate (free, no API key, max 1000 chars per request)
async function translateWithBing(text, from, to) {
  const MAX_CHARS = 900;

  if (text.length <= MAX_CHARS) {
    const result = await bingTranslate(text, from || "en", to || "id");
    return result.translation;
  }

  // Split on newlines for longer text
  const lines = text.split("\n");
  let chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > MAX_CHARS && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);

  // Process chunks in parallel
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const result = await bingTranslate(chunk, from || "en", to || "id");
        return result.translation;
      } catch (e) {
        return chunk;
      }
    }),
  );
  return results.join("\n");
}

// Engine: MyMemory API (free, 5000 chars/day, no auth needed)
async function translateWithMyMemory(text, from, to) {
  const langPair = `${from || "en"}|${to || "id"}`;

  // MyMemory has 500 char limit per request, so split if needed
  const MAX_CHARS = 490;
  if (text.length <= MAX_CHARS) {
    const response = await axios.get(
      "https://api.mymemory.translated.net/get",
      {
        params: { q: text, langpair: langPair },
        timeout: 15000,
      },
    );
    if (response.data && response.data.responseData) {
      return response.data.responseData.translatedText;
    }
    throw new Error("MyMemory returned empty response");
  }

  // Split on newlines for subtitle batches
  const lines = text.split("\n");
  let chunks = [];
  let current = "";

  for (const line of lines) {
    if ((current + "\n" + line).length > MAX_CHARS && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + "\n" + line : line;
    }
  }
  if (current) chunks.push(current);

  // Process chunks in PARALLEL for speed
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const response = await axios.get(
          "https://api.mymemory.translated.net/get",
          {
            params: { q: chunk, langpair: langPair },
            timeout: 15000,
          },
        );
        if (response.data && response.data.responseData) {
          return response.data.responseData.translatedText;
        }
        return chunk;
      } catch (e) {
        return chunk;
      }
    }),
  );
  return results.join("\n");
}

// Wrap an engine fn with a timeout (ms)
function withTimeout(fn, ms, engineName) {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${engineName} timed out after ${ms}ms`)),
      ms,
    );
    try {
      const result = await fn();
      clearTimeout(timer);
      resolve(result);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}

app.post("/translate-google", async (req, res) => {
  const { text, from, to } = req.body;
  if (!text) return res.status(400).send("Text is required");

  const cacheKey = `${text}_${to || "id"}`;
  const cached = translationCache.get(cacheKey);

  if (cached) {
    console.log(`Cache Hit: ${text.substring(0, 30)}...`);
    return res.json({ text: cached });
  }

  // Race all fast engines in parallel — first one wins
  const ENGINE_TIMEOUT = 8000; // 8s max per engine

  const engines = [
    {
      name: "Google-Direct",
      fn: () => translateWithGoogleDirect(text, from, to),
    },
    { name: "Bing", fn: () => translateWithBing(text, from, to) },
    { name: "MyMemory", fn: () => translateWithMyMemory(text, from, to) },
  ];

  console.log(`[Race] Translating: ${text.substring(0, 40)}...`);

  // Build race: each engine resolves with { text, engine } or rejects on failure/timeout
  const racers = engines.map(({ name, fn }) =>
    withTimeout(fn, ENGINE_TIMEOUT, name)
      .then((text) => ({ text, engine: name }))
      .catch((e) => Promise.reject({ engine: name, error: e })),
  );

  // Collect results — keep retrying until one succeeds
  let lastError = null;
  const settled = await Promise.allSettled(racers);

  // Pick the first fulfilled result
  for (const result of settled) {
    if (result.status === "fulfilled") {
      let { text: translatedText, engine } = result.value;

      if ((!to || to === "id") && translatedText) {
        translatedText = applyInformalStyle(translatedText);
      }

      translationCache.set(cacheKey, translatedText);
      console.log(
        `[${engine}] ✅ Success: ${translatedText.substring(0, 40)}...`,
      );
      return res.json({ text: translatedText, engine });
    } else {
      const { engine, error } = result.reason || {};
      console.warn(
        `[${engine || "?"}] ❌ Failed: ${error?.message?.substring(0, 60)}`,
      );
      lastError = error;
    }
  }

  // All engines failed
  console.error("All translation engines failed!");
  res
    .status(500)
    .json({ error: `All engines failed. Last: ${lastError?.message}` });
});

// Proxy endpoint
app.get("/proxy", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("URL is required");
  }

  try {
    console.log(`Proxying request to: ${url}`);

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: {
        Referer: "https://rapid-cloud.co/",
        Origin: "https://rapid-cloud.co",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
      },
    });

    // Suppress socket errors on the response stream
    if (response.request && response.request.socket) {
      response.request.socket.on("error", () => {});
    }

    // Forward content type
    if (response.headers["content-type"]) {
      res.setHeader("Content-Type", response.headers["content-type"]);
    }

    console.log(
      `Upstream Success: Status ${response.status}, Length ${response.data.length || response.data.byteLength}`,
    );

    res.send(response.data);
  } catch (error) {
    console.error(`Proxy Error for URL: ${url}`);
    console.error("Error Message:", error.message);
    if (error.response) {
      console.error("Upstream Status:", error.response.status);
      console.error(
        "Upstream Headers:",
        JSON.stringify(error.response.headers),
      );

      // Check if upstream sent a 403 Forbidden
      if (error.response.status === 403) {
        console.error("Access Forbidden. Headers sent:", {
          Referer: "https://rapid-cloud.co/",
          Origin: "https://rapid-cloud.co",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
        });
      }

      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

app.listen(PORT, async () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log("");
  console.log("🚀 Starting auto-proxy discovery...");
  console.log(
    "   Server is ready to accept requests while proxies are loading.",
  );
  console.log(
    "   Translation will use direct connection until proxies are ready.",
  );
  console.log("");

  // Load proxies in background
  await loadWorkingProxies();

  if (proxyEnabled) {
    console.log("");
    console.log(`✅ Proxy rotation active with ${proxyList.length} proxies.`);
  } else {
    console.log("");
    console.log("⚠️  No working proxies found. Using direct connection.");
    console.log("   If you get 429 errors, try:");
    console.log("   1. Visit http://localhost:3002/fetch-proxies to retry");
    console.log("   2. Use a VPN");
    console.log("   3. POST to /set-proxies with your own proxy list");
  }
});
