const winston = require("winston");
require("winston-daily-rotate-file");

const uppercaseLevel = winston.format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

const customFormat = winston.format.printf(
  ({ level, message, timestamp, worker }) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour12: false,
    });

    const workerLabel = worker ? `${worker} ` : "worker-01 ";

    return `${timeStr} WIB [${level}] ${workerLabel}${message}`;
  }
);

const logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        uppercaseLevel(), 
        winston.format.colorize({ all: true }), 
        customFormat
      ),
    }),
    new winston.transports.DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      format: winston.format.combine(
        winston.format.timestamp(),
        uppercaseLevel(),
        customFormat
      ),
    }),
  ],
});

module.exports = logger;