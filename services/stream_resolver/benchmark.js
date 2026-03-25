const axios = require("axios");

const TOTAL = parseInt(process.argv[2]) || 15000;
const CONCURRENCY =  10;
const API_URL = "http://localhost:5790/api/resolve";

const EPISODE_URLS = [
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19680",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19681",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19682",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19683",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19684",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19685",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19686",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19687",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19688",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19689",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19690",
  "https://9animetv.to/watch/the-quintessential-quintuplets-1368?ep=19691",
];

const results = [];
let completed = 0;
let errors = 0;

async function runRequest(index) {
  const url = EPISODE_URLS[index % EPISODE_URLS.length];
  const start = Date.now();

  try {
    const res = await axios.post(API_URL, { url }, { timeout: 15000 });
    const ms = Date.now() - start;
    const success = res.data?.status === "success";
    results.push({ ms, success });
    if (!success) errors++;
  } catch (err) {
    const ms = Date.now() - start;
    results.push({ ms, success: false });
    errors++;
  }

  completed++;
  if (completed % 50 === 0 || completed === TOTAL) {
    const soFar = results.map((r) => r.ms);
    const avg = (
      soFar.reduce((a, b) => a + b, 0) /
      soFar.length /
      1000
    ).toFixed(3);
    process.stdout.write(
      `\r[${completed}/${TOTAL}] avg: ${avg}s | errors: ${errors}   `,
    );
  }
}

async function runWithConcurrency() {
  console.log(`\n🚀 Benchmark: ${TOTAL} requests, concurrency: ${CONCURRENCY}`);
  console.log(`   Endpoint: ${API_URL}`);
  console.log(`   Episodes: ${EPISODE_URLS.length} URLs (cycling)\n`);

  const startAll = Date.now();
  const queue = Array.from({ length: TOTAL }, (_, i) => i);

  async function worker() {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;
      await runRequest(index);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const totalMs = Date.now() - startAll;
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);

  const p = (pct) => times[Math.floor((pct / 100) * times.length)] || 0;

  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `  📊 HASIL BENCHMARK (${TOTAL} request, concurrency ${CONCURRENCY})`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Total waktu    : ${(totalMs / 1000).toFixed(2)}s`);
  console.log(
    `  Throughput     : ${(TOTAL / (totalMs / 1000)).toFixed(2)} req/s`,
  );
  console.log(`  ─────────────────────────────────────────────`);
  console.log(`  Avg per request: ${(sum / times.length / 1000).toFixed(3)}s`);
  console.log(`  Min            : ${(times[0] / 1000).toFixed(3)}s`);
  console.log(
    `  Max            : ${(times[times.length - 1] / 1000).toFixed(3)}s`,
  );
  console.log(`  P50 (median)   : ${(p(50) / 1000).toFixed(3)}s`);
  console.log(`  P90            : ${(p(90) / 1000).toFixed(3)}s`);
  console.log(`  P95            : ${(p(95) / 1000).toFixed(3)}s`);
  console.log(`  P99            : ${(p(99) / 1000).toFixed(3)}s`);
  console.log(`  ─────────────────────────────────────────────`);
  console.log(
    `  Success rate   : ${(((TOTAL - errors) / TOTAL) * 100).toFixed(1)}% (${TOTAL - errors}/${TOTAL})`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

runWithConcurrency();
