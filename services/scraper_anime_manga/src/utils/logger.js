const winston = require('winston');
require('winston-daily-rotate-file');

const costumFormat = winston.format.printf(({ level, message, timestamp }) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour12: false,
    });

    return `${timeStr} WIB [${level.toUpperCase()}] ${message}`;
});

const fileRotateTransport = new winston.transports.DailyRotateFile({
    filename: 'logs/app-error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    level: 'warn',
    maxFiles: '14d',
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(winston.format.timestamp(), customFormat),
    transports: [new winston.transports.Console(), fileRotateTransport],
});

module.exports = logger;
