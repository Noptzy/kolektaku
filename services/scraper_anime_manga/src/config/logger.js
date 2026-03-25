const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const wibTimestamp = () =>
    new Date()
        .toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        .replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$2-$1');

const C = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    error: '\x1b[38;5;203m',
    warn: '\x1b[38;5;220m',
    info: '\x1b[38;5;75m',
    http: '\x1b[38;5;114m',
    debug: '\x1b[38;5;141m',
    time: '\x1b[38;5;245m',
    white: '\x1b[38;5;255m',
    gray: '\x1b[38;5;240m',
};

const ICONS = { error: '✖', warn: '⚠', info: '●', http: '→', debug: '◉' };

const consoleFormat = winston.format.printf(({ level, message, label, ...meta }) => {
    const color = C[level] ?? C.info;
    const icon = ICONS[level] ?? '●';
    const tag = level.toUpperCase().padEnd(5);
    const ts = `${C.time}[${wibTimestamp()}]${C.reset}`;
    const lbl = label ? `${C.gray}[${C.white}${label}${C.gray}]${C.reset} ` : '';
    const lvl = `${color}${C.bold}${icon} ${tag}${C.reset}`;
    const msg = `${color}${message}${C.reset}`;

    const extras = Object.keys(meta).filter((k) => k !== 'timestamp' && k !== 'service');
    const metaStr = extras.length
        ? `\n${C.dim}${JSON.stringify(Object.fromEntries(extras.map((k) => [k, meta[k]])), null, 2)}${C.reset}`
        : '';

    return `${ts} ${lvl} ${lbl}${msg}${metaStr}`;
});

const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: wibTimestamp }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
);

const logsDir = path.resolve(__dirname, '../../logs');

const transports = [
    new winston.transports.Console({
        format: winston.format.combine(winston.format.errors({ stack: true }), consoleFormat),
    }),
];

if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new DailyRotateFile({
            filename: path.join(logsDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxAge: '14d',
            maxFiles: '14d',
            zippedArchive: false,
            format: fileFormat,
            handleExceptions: true,
        }),
        new DailyRotateFile({
            filename: path.join(logsDir, 'warn-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            level: 'warn',
            maxAge: '14d',
            maxFiles: '14d',
            zippedArchive: false,
            format: fileFormat,
        }),
    );
}

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transports,
    exitOnError: false,
});

module.exports = { logger, C };
