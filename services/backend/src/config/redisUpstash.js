const Redis = require('ioredis');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

const ioRedisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const redis = {
    get: async (key) => {
        const val = await ioRedisClient.get(key);
        if (!val) return val;
        try {
            return JSON.parse(val);
        } catch(e) {
            return val;
        }
    },
    set: async (key, value, options) => {
        let valToStore = typeof value === 'string' ? value : JSON.stringify(value);
        if (options && options.ex) {
            return ioRedisClient.set(key, valToStore, 'EX', options.ex);
        }
        return ioRedisClient.set(key, valToStore);
    },
    del: async (key) => {
        return ioRedisClient.del(key);
    }
};

module.exports = redis;
