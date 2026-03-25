const { Connection } = require("rabbitmq-client");
const streamService = require("../services/stream.service");
const logger = require("../utils/logger");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost";
const QUEUE_NAME = "stream_resolve_rpc";

let rabbit;
let rpcServer;

function start() {
  rabbit = new Connection(RABBITMQ_URL);

  rabbit.on("error", (err) => {
    logger.error(`RabbitMQ connection error: ${err.message}`);
  });

  rabbit.on("connection", () => {
    logger.info("RabbitMQ connected successfully");
  });

  rpcServer = rabbit.createConsumer(
    {
      queue: QUEUE_NAME,
      queueOptions: { durable: true },
      concurrency: 5,
    },
    async (msg, reply) => {
      const { url, workerId: clientWorkerId } = msg.body;
      const workerId =
        clientWorkerId ||
        `rmq-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;

      logger.info(
        `[RabbitMQ RPC] Received job for URL: ${url} (workerId: ${workerId})`
      );

      try {
        const result = await streamService.resolveEpisode(url, workerId);

        logger.info(
          `[RabbitMQ RPC] Job completed for workerId: ${workerId}, source: ${result.source}`
        );

        await reply(result);
      } catch (error) {
        logger.error(
          `[RabbitMQ RPC] Job failed for workerId: ${workerId}: ${error.message}`
        );
        await reply({ error: true, message: error.message });
      }
    }
  );

  rpcServer.on("error", (err) => {
    logger.error(`[RabbitMQ RPC] Consumer error: ${err.message}`);
  });

  logger.info(
    `[RabbitMQ RPC] Consumer started, listening on queue "${QUEUE_NAME}"`
  );
}

async function stop() {
  if (rpcServer) await rpcServer.close();
  if (rabbit) await rabbit.close();
}

module.exports = { start, stop };
