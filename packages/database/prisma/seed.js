require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
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

    // Seed Voucher Codes
    const vouchers = [
        {
            id: '018617d3-6e9f-7e04-9a0d-4f3df9b4eaf0',
            code: 'WELCOME50',
            discountPercent: 50,
            maxUses: 100,
            usedCount: 0,
            planId: null, // Any plan
            isActive: true,
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // expires next year
        },
        {
            id: '018617d3-6e9f-7e04-9a0d-4f3df9b4eaf1',
            code: 'FREE100',
            discountPercent: 100,
            maxUses: 50,
            usedCount: 0,
            planId: 3, // Premium 1 Bulan
            isActive: true,
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        }
    ];

    for (const v of vouchers) {
        await prisma.voucherCode.upsert({
            where: { code: v.code },
            update: {
                discountPercent: v.discountPercent,
                maxUses: v.maxUses,
                planId: v.planId,
                isActive: v.isActive,
                expiresAt: v.expiresAt,
            },
            create: {
                id: v.id,
                code: v.code,
                discountPercent: v.discountPercent,
                maxUses: v.maxUses,
                usedCount: v.usedCount,
                planId: v.planId,
                isActive: v.isActive,
                expiresAt: v.expiresAt,
                createdAt: new Date(),
            },
        });
    }

    console.log('✅ Voucher codes seeded');

    // Seed Premium Trials for Existing Users
    const users = await prisma.user.findMany({
        where: { premiumTrial: null }
    });

    let trialSeededCount = 0;
    for (const user of users) {
        const start = new Date();
        const expires = new Date();
        expires.setDate(expires.getDate() + 7); // 7 days trial

        await prisma.premiumTrial.create({
            data: {
                userId: user.id,
                startedAt: start,
                expiresAt: expires,
                isUsed: false,
                createdAt: start,
            }
        });
        trialSeededCount++;
    }

    console.log(`✅ Premium trials seeded for ${trialSeededCount} users`);

    // Seed Admin User (Specific Account)
    const adminUser = {
        id: '019d2512-38da-762f-86a8-d4cfa19fbbe4',
        email: 'tegaribrahim1705@gmail.com',
        name: 'Tegar',
        roleId: 1, // admin
        oauthId: '111627491467058311364',
        avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIZu_go8snrwZeXppXO6v256t_5GQBoKesOZV6jXi84SU5TpyQdpA=s96-c',
        provider: 'google',
    };

    await prisma.user.upsert({
        where: { email: adminUser.email },
        update: {
            roleId: adminUser.roleId,
            oauthId: adminUser.oauthId,
            avatarUrl: adminUser.avatarUrl,
            name: adminUser.name,
        },
        create: adminUser,
    });

    console.log('✅ Admin seeded/updated');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
