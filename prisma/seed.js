require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    await prisma.role.upsert({ where: { id: 1 }, update: {}, create: { id: 1, title: 'admin', createdAt: new Date() } });
    await prisma.role.upsert({ where: { id: 2 }, update: {}, create: { id: 2, title: 'premium', createdAt: new Date() } });
    await prisma.role.upsert({ where: { id: 3 }, update: {}, create: { id: 3, title: 'basic', createdAt: new Date() } });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
