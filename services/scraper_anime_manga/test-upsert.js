require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        // We'll just fetch ANY AnimeDetail to test the episode upsert
        const anime = await prisma.animeDetail.findFirst();
        if (!anime) {
            console.log("No anime found to test with.");
            return;
        }
        
        console.log("Testing Episode upsert...");
        const ep = await prisma.episode.upsert({
            where: {
                animeId_episodeNumber: {
                    animeId: anime.id,
                    episodeNumber: 1.0,
                },
            },
            update: {
                title: 'Test Episode',
            },
            create: {
                animeId: anime.id,
                episodeNumber: 1.0,
                title: 'Test Episode',
            },
        });
        console.log("Episode upsert success!");
        
        console.log("Testing EpisodeSource upsert...");
        await prisma.episodeSource.upsert({
            where: {
                episodeId_serverName_audio: {
                    episodeId: ep.id,
                    serverName: '9anime',
                    audio: 'sub',
                },
            },
            update: {
                urlSource: 'http://test.com',
            },
            create: {
                episodeId: ep.id,
                serverName: '9anime',
                audio: 'sub',
                urlSource: 'http://test.com',
            },
        });
        console.log("EpisodeSource upsert success!");

    } catch (e) {
        console.error("UPSERT ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
test();
