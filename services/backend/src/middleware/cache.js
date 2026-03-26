const { logger } = require('../config/logger');
const redis = require('../config/redisUpstash');

const cacheMiddleware = (ttl = 300, prefix = 'cache:api:anime') => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }

        const key = `${prefix}:${req.originalUrl}`;

        try {
            const cachedData = await redis.get(key);
            if (cachedData) {
                const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
                return res.status(200).json(data);
            }

            const originalJson = res.json;
            res.json = function (body) {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.set(key, JSON.stringify(body), { ex: ttl }).catch(err => {
                        logger.error(`Cache write error for key ${key}:`, err);
                    });
                }
                
                return originalJson.call(this, body);
            };

            next();
        } catch (error) {
            logger.error(`Cache middleware error for key ${key}:`, error);
            next();
        }
    };
};

module.exports = cacheMiddleware;
