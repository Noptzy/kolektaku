require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
    // Seed Roles
    await prisma.role.upsert({ where: { id: 1 }, update: {}, create: { id: 1, title: 'admin', createdAt: new Date() } });
    await prisma.role.upsert({ where: { id: 2 }, update: {}, create: { id: 2, title: 'premium', createdAt: new Date() } });
    await prisma.role.upsert({ where: { id: 3 }, update: {}, create: { id: 3, title: 'basic', createdAt: new Date() } });

    console.log('✅ Roles seeded');

    // Seed Membership Plans
    const plans = [
        {
            id: 1,
            title: 'LIFETIME',
            desc: 'Akses premium selamanya sampai server EOS (End Of Service). Termasuk API keys untuk monetisasi.',
            price: BigInt(1000000),
            durationDays: null,
            isActive: true,
        },
        {
            id: 2,
            title: 'Premium 1 Tahun',
            desc: 'Akses premium selama 1 tahun. Bebas iklan saat menonton anime.',
            price: BigInt(100000),
            durationDays: 365,
            isActive: true,
        },
        {
            id: 3,
            title: 'Premium 1 Bulan',
            desc: 'Akses premium selama 1 bulan. Bebas iklan saat menonton anime.',
            price: BigInt(12000),
            durationDays: 30,
            isActive: true,
        },
    ];

    for (const plan of plans) {
        const now = new Date();
        await prisma.membershipPlan.upsert({
            where: { id: plan.id },
            update: {
                title: plan.title,
                desc: plan.desc,
                price: plan.price,
                durationDays: plan.durationDays,
                isActive: plan.isActive,
                updatedAt: now,
            },
            create: {
                id: plan.id,
                title: plan.title,
                desc: plan.desc,
                price: plan.price,
                durationDays: plan.durationDays,
                isActive: plan.isActive,
                createdAt: now,
                updatedAt: now,
            },
        });
    }

    console.log('✅ Membership plans seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
