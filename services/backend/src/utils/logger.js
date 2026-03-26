const { logger, C } = require('../config/logger');

const createLogger = (label) => logger.child({ label });

const httpLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        const status = res.statusCode;

        const color = status >= 500 ? C.error : status >= 400 ? C.warn : status >= 300 ? C.debug : C.http;

        const method = `${C.bold}${req.method.padEnd(7)}${C.reset}`;
        const colored = `${color}${C.bold}${status}${C.reset}`;
        const url = `${C.white}${req.originalUrl}${C.reset}`;
        const duration = `${C.dim}(${ms}ms)${C.reset}`;

        logger.http(`${method} ${colored} ${url} ${duration}`);
    });
    next();
};

logger.createLogger = createLogger;
logger.httpLogger = httpLogger;

module.exports = logger;
