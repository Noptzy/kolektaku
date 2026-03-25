const { execSync } = require('child_process');
const path = require('path');

async function main() {
    console.log('============= DATABASE CLEANER =============');
    console.log('WARNING: This will completely WIPE the "kolektaku" database.');
    console.log('Running Prisma Migrate Reset...');
    
    try {
        const rootDir = path.resolve(__dirname, '../../');
        
        // Execute the reset command
        execSync('npx prisma migrate reset --force --skip-seed', {
            cwd: rootDir,
            stdio: 'inherit'
        });
        
        console.log('Database successfully dropped and re-migrated to the latest schema.');
        console.log('============================================');
    } catch (error) {
        console.error('Failed to reset the database:');
        console.error(error.message);
        process.exit(1);
    }
}

main();
