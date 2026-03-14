require('dotenv/config');
// BigInt JSON serialization support (Prisma uses BigInt for price fields)
BigInt.prototype.toJSON = function () { return Number(this); };
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const logger = require('./utils/logger');
const routes = require('./routes/index.js');
const resHandler = require('./utils/resHandler');

const app = express();
const PORT = process.env.PORT || 4000;

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
