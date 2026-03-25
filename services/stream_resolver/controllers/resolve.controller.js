const streamService = require("../services/stream.service");
const logger = require("../utils/logger");

const resolveStream = async (req, res, next) => {
  try {
    const url = req.body?.url || req.query?.url;

    if (!url) {
      return res
        .status(400)
        .json({
          success: false,
          error:
            "Parameter url sangat diperlukan. Pastikan format JSON atau query URL valid!",
        });
    }

    const workerId = `user-req-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    logger.info(`Incoming request to resolve: ${url}`, { worker: workerId });

    const streamData = await streamService.resolveEpisode(url, workerId);

    res.json({
      status: "success",
      source: streamData.source,
      workerId: workerId,
      data: streamData.data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolveStream,
};
