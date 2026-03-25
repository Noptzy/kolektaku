const puppeteerWorker = require("../workers/puppeteer.worker");
const logger = require("../utils/logger");

class QueueManager {
  constructor(concurrencyLimit = 10) {
    this.concurrencyLimit = concurrencyLimit;
    this.activeJobs = 0;
    this.queue = [];
  }

  addJob(jobData) {
    return new Promise((resolve, reject) => {
      this.queue.push({ jobData, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeJobs >= this.concurrencyLimit || this.queue.length === 0) {
      return;
    }

    this.activeJobs++;
    const { jobData, resolve, reject } = this.queue.shift();

    logger.info(`Starting Puppeteer Job. Active Jobs: ${this.activeJobs}`, {
      worker: jobData.workerId,
    });

    try {
      const result = await puppeteerWorker.scrapeStream(
        jobData.url,
        jobData.workerId,
      );
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeJobs--;
      logger.info(`Puppeteer Job Finished. Active Jobs: ${this.activeJobs}`, {
        worker: jobData.workerId,
      });

      this.processQueue();
    }
  }
}

module.exports = new QueueManager(10);
