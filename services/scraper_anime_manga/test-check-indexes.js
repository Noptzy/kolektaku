require('dotenv').config();
const prisma = require('./src/config/prisma');

async function test() {
    try {
        const result = await prisma.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'episodes' OR tablename = 'episode_sources'`;
        console.log(result);
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await prisma.$disconnect();
    }
}
test();
