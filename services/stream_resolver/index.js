require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");
const resolveRoute = require("./routes/resolve.route");
const rabbitmqConsumer = require("./queues/rabbitmqConsumer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", resolveRoute);

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} Not Found`,
  });
});

app.use((err, req, res, next) => {
  logger.error(`Global Error: ${err.message}`);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

const PORT = process.env.STREAM_RESOLVER_PORT || 5790;
app.listen(PORT, () => {
  logger.info(`Stream Resolver server started on port ${PORT}`);

  rabbitmqConsumer.start();
});
