const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = redis;
