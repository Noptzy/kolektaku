const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function runTest() {
    console.log('🚀 Memulai browser dengan IP Pinning (Cloudflare)...');

    // Mengambil IP dari hasil query Anda
    const cloudflareIp = '172.67.180.216'; // Anda bisa ganti ke 104.21.83.186 jika gagal
    const hostRules = `MAP 9animetv.to ${cloudflareIp}, MAP www.9animetv.to ${cloudflareIp}`;

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            
            // TEKNIK IP PINNING: Memaksa domain ke IP Cloudflare spesifik
            `--host-resolver-rules=${hostRules}`,
            
            // DNS & SNI PROTEKSI
            '--enable-features=EncryptedClientHello',
            '--dns-over-https-mode=secure',
            '--dns-over-https-templates=https://1.1.1.1/dns-query',
            
            // Bypass SSL error agar tidak langsung mati saat Telkomsel intercept
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    try {
        console.log(`🌐 Mencoba akses 9animetv.to via ${cloudflareIp}...`);

        await page.goto('https://9animetv.to/filter?keyword=One+Piece', {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });

        const state = await page.evaluate(() => {
            const body = document.body.innerText.toLowerCase();
            const isBlocked = body.includes('internet baik') || body.includes('internet positif');
            const hasCards = !!document.querySelector('.flw-item');
            
            return {
                title: document.title,
                url: window.location.href,
                isBlocked,
                hasCards,
                contentSample: body.slice(0, 100)
            };
        });

        console.log('\n--- ANALISIS KONEKSI ---');
        console.log('URL Akhir    :', state.url);
        console.log('Judul        :', state.title);

        if (state.isBlocked) {
            console.log('❌ GAGAL: Masih diarahkan ke halaman blokir Telkomsel.');
        } else if (state.hasCards) {
            console.log('✅ BERHASIL: Konten anime terdeteksi!');
        } else {
            console.log('⚠️ PERINGATAN: Berhasil masuk tapi selector .flw-item tidak ada.');
            console.log('Cuplikan teks:', state.contentSample);
        }

    } catch (error) {
        console.error('❌ Terjadi Error:', error.message);
        await page.screenshot({ path: 'debug-koneksi.png' });
        console.log('📸 Screenshot kondisi tersimpan di debug-koneksi.png');
    } finally {
        console.log('\n⌛ Menahan browser selama 10 detik...');
        await new Promise((r) => setTimeout(r, 10000));
        await browser.close();
    }
}

runTest();