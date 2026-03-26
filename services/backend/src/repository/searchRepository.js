const prisma = require('../config/prisma');

class SearchRepository {
    async searchAll(query, take = 5) {
        const koleksiByTitle = await prisma.koleksi.findMany({
            take,
            where: {
                publishStatus: 'published',
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { slug: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                title: true,
                slug: true,
                posterUrl: true,
                type: true,
            },
        });

        const koleksiByAlt = await prisma.$queryRawUnsafe(`
            SELECT id, title, slug, poster_url AS "posterUrl", type
            FROM koleksi
            WHERE publish_status = 'published'
              AND alt_titles::text ILIKE $1
            LIMIT $2
        `, `%${query}%`, take);

        const seenIds = new Set(koleksiByTitle.map(k => k.id));
        const koleksi = [...koleksiByTitle];
        for (const item of koleksiByAlt) {
            if (!seenIds.has(item.id)) {
                koleksi.push(item);
                seenIds.add(item.id);
            }
        }

        const studios = await prisma.studio.findMany({
            take,
            where: {
                name: { contains: query, mode: 'insensitive' },
            },
            select: {
                id: true,
                name: true,
            },
        });

        const voiceActors = await prisma.voiceActor.findMany({
            take,
            where: {
                name: { contains: query, mode: 'insensitive' },
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
            },
        });

        const characters = await prisma.character.findMany({
            take,
            where: {
                name: { contains: query, mode: 'insensitive' },
            },
            select: {
                id: true,
                name: true,
                imageUrl: true,
            },
        });

        return { koleksi, studios, voiceActors, characters };
    }
}

module.exports = new SearchRepository();
