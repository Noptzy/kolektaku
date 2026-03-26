const prisma = require('../../config/prisma');
const resHandler = require('../../utils/resHandler');

exports.getAll = async (req, res, next) => {
    try {
        // Lazy expiration: mark all pending transactions older than 30 mins as failed
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        await prisma.transaction.updateMany({
            where: {
                status: 'pending',
                createdAt: { lt: thirtyMinsAgo }
            },
            data: { status: 'failed', updatedAt: new Date() }
        });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const transactions = await prisma.transaction.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                plan: {
                    select: { id: true, title: true }
                }
            }
        });
        
        const total = await prisma.transaction.count();
        
        // Serialisasi BigInt di amount
        const data = transactions.map(trx => ({
            ...trx,
            amount: trx.amount ? Number(trx.amount) : null
        }));

        res.status(200).json(resHandler.success('Transactions fetched', {
            transactions: data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }));
    } catch (error) {
        next(error);
    }
};
