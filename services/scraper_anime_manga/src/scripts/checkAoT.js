const { Client } = require('pg');
require('dotenv').config();

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();

    const res = await client.query(`
        SELECT title, alt_titles 
        FROM koleksi 
        WHERE id = '019cdb36-c313-7798-abfb-a75d66278af2';
    `);

    const fs = require('fs');
    fs.writeFileSync('aot_alttitles.json', JSON.stringify(res.rows, null, 2));
    console.log("Written to aot_alttitles.json");

    await client.end();
}

main().catch(console.error);
