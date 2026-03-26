require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const dns = require('dns');

const originalLookup = dns.lookup;
dns.lookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    if (hostname && hostname.startsWith('9animetv.to')) {
        if (options.all) {
            return callback(null, [{ address: '104.21.83.186', family: 4 }]);
        }
        return callback(null, '104.21.83.186', 4);
    }
    return originalLookup(hostname, options, callback);
};

BigInt.prototype.toJSON = function () { return Number(this); };
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('./config/passport');
const logger = require('./utils/logger');
const routes = require('./routes/index.js');
const resHandler = require('./utils/resHandler');
const redis = require('./config/redisUpstash');
const amqp = require('./queues/rabbitmq');
const scheduleCron = require('./queues/scheduleCron');

amqp.connectRabbitMQ().then(() => {
    scheduleCron.startScheduleCron();
}).catch(err => {
    logger.error('Error initializing RabbitMQ on startup:', err.message);
});

const app = express();
const PORT = process.env.BACKEND_PORT || 4000;

// Security Middleware
app.use(helmet());

// IP Ban Middleware (Check for Banned IPs in Redis)
app.use(async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Whitelist Localhost for development
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
      return next();
    }

    const isBanned = await redis.get(`banned_ip:${ip}`);
    if (isBanned) {
      return res.status(403).json(resHandler.error('IP Anda diblokir selama 1 jam karena terdeteksi serangan/spam (melebihi 100 req/menit).'));
    }
    next();
  } catch (err) {
    next(); // Fallback if redis fails
  }
});

// Rate Limiting (100 req/min)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 1000, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, _next, options) => {
    const ip = req.ip || req.connection.remoteAddress;

    // Skip banning for localhost
    const isLocalhost = ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost');

    if (!isLocalhost) {
      // Ban the IP for 1 hour if they hit the 100/min limit
      try {
        await redis.set(`banned_ip:${ip}`, 'true', { ex: 3600 });
      } catch (err) {
        console.error('Failed to ban IP in Redis:', err);
      }
    }

    res.status(429).json(resHandler.error(
      isLocalhost 
        ? 'Batas 100 request/menit terlampaui (Localhost tidak diban).' 
        : 'Batas 100 request/menit terlampaui. IP Anda telah diblokir selama 1 jam.', 
      { banned: !isLocalhost }
    ));
  }
});
app.use(limiter);

const allowedOrigins = process.env.CLIENT_URL 
? process.env.CLIENT_URL.split(',').map(s => s.trim()) 
: '*';

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(logger.httpLogger);

app.use('/api', routes);

app.use((_req, res) => res.status(404).json(resHandler.error('404 Not Found')));

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
