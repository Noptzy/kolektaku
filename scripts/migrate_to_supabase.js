const { Client } = require('pg');
require('dotenv').config();

// BigInt replacer for JSON.stringify
const bigIntReplacer = (key, value) => {
    return typeof value === 'bigint' ? value.toString() : value;
};

// Configuration from .env
const SOURCE_URL = "postgresql://postgres:236ndntm@localhost:5432/kolektaku_dev";
const TARGET_URL = process.env.DIRECT_URL; // Using direct URL for migration

async function migrate() {
    console.log("🚀 Starting database migration from Local to Supabase...");
    
    const sourceClient = new Client({ connectionString: SOURCE_URL });
    const targetClient = new Client({ connectionString: TARGET_URL });

    try {
        await sourceClient.connect();
        await targetClient.connect();
        console.log("✅ Connected to both databases.");

        // 1. Get all tables in public schema
        const tablesRes = await sourceClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            AND table_name != '_prisma_migrations'
            ORDER BY table_name;
        `);
        const tables = tablesRes.rows.map(r => r.table_name.trim());
        console.log(`📋 Found ${tables.length} tables to migrate.`);

        // 2. Disable foreign key constraints on target for the session
        await targetClient.query("SET session_replication_role = 'replica';");
        console.log("🔓 Disabled foreign key triggers on Target.");

        for (const table of tables) {
            console.log(`📦 Processing table: public."${table}"...`);

            // Fetch data from source
            const sourceData = await sourceClient.query(`SELECT * FROM public."${table}"`);
            const rows = sourceData.rows;

            if (rows.length === 0) {
                console.log(`   - Table "${table}" is empty. Skipping.`);
                continue;
            }

            console.log(`   - Found ${rows.length} rows. Preparing to insert...`);

            // Prepare for batch insert on target
            const columns = sourceData.fields.map(f => `"${f.name}"`).join(', ');
            
            // Clear target table first? No, the user said "copy", but usually we want to avoid duplicates.
            // However, a clean "copy" usually implies the target should match the source.
            // We'll TRUNCATE first to ensure an exact copy without primary key violations.
            await targetClient.query(`TRUNCATE TABLE public."${table}" CASCADE`);

            // Batch insert
            for (let i = 0; i < rows.length; i += 500) {
                const batch = rows.slice(i, i + 500);
                const values = [];
                const placeholders = [];

                batch.forEach((row, rowIndex) => {
                    const rowPlaceholders = [];
                    sourceData.fields.forEach((field, fieldIndex) => {
                        let value = row[field.name];
                        
                        // If value is an object/array (not null), stringify it for JSON columns
                        if (value !== null && typeof value === 'object') {
                            value = JSON.stringify(value, bigIntReplacer);
                        }
                        
                        values.push(value);
                        rowPlaceholders.push(`$${values.length}`);
                    });
                    placeholders.push(`(${rowPlaceholders.join(', ')})`);
                });

                const query = `INSERT INTO public."${table}" (${columns}) VALUES ${placeholders.join(', ')}`;
                await targetClient.query(query, values);
                console.log(`   - Inserted rows ${i + 1} to ${Math.min(i + 500, rows.length)}`);
            }
            
            console.log(`✅ Finished table: ${table}`);
        }

        // 3. Re-enable foreign key constraints
        await targetClient.query("SET session_replication_role = 'origin';");
        console.log("🔒 Re-enabled foreign key triggers on Target.");

        console.log("\n✨ Migration completed successfully!");

    } catch (err) {
        console.error("❌ Migration failed:", err);
        // Attempt to re-enable triggers even on failure
        try { await targetClient.query("SET session_replication_role = 'origin';"); } catch (e) {}
    } finally {
        await sourceClient.end();
        await targetClient.end();
    }
}

migrate();
