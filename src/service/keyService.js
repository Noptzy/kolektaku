const keyRepository = require('../repository/keyRepository');
const prisma = require('../config/prisma');

const KEY_PRICE_IDR = 2000; // 1 key = Rp 2.000
const AD_REWARD_KEYS = 3;   // Watch ad = 3 keys

class KeyService {
    async getBalance(userId) {
        const keys = await keyRepository.findByUserId(userId);
        return { balance: keys?.balance || 0 };
    }

    async addKeysFromAd(userId) {
        const keys = await keyRepository.upsertKeys(userId, AD_REWARD_KEYS);
        return { balance: keys.balance, added: AD_REWARD_KEYS, source: 'ad' };
    }

    async purchaseKeys(userId, quantity) {
        if (!quantity || quantity <= 0) throw { status: 400, message: 'Invalid quantity' };

        const totalCost = quantity * KEY_PRICE_IDR;
        const keys = await keyRepository.upsertKeys(userId, quantity);

        return {
            balance: keys.balance,
            purchased: quantity,
            totalCost,
            pricePerKey: KEY_PRICE_IDR,
        };
    }

    async consumeKey(userId) {
        // Check if user is premium — premium users don't need keys
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true, premiumTrial: true },
        });

        if (!user) throw { status: 404, message: 'User not found' };

        // Premium users (roleId 2 or active subscription/trial)
        const isPremium = user.roleId <= 2;
        const hasActiveSub = user.subscription && (!user.subscription.expiredAt || new Date(user.subscription.expiredAt) > new Date());
        const hasActiveTrial = user.premiumTrial && new Date(user.premiumTrial.expiresAt) > new Date();

        if (isPremium || hasActiveSub || hasActiveTrial) {
            return { consumed: false, reason: 'premium', balance: null };
        }

        // Basic users need to consume a key
        const keys = await keyRepository.consumeKey(userId);
        return { consumed: true, balance: keys.balance };
    }
}

module.exports = new KeyService();
