require('dotenv/config');
const express = require('express');
const cors = require('cors');
const passport = require('./config/passport');
const logger = require('./utils/logger');
const routes = require('./routes/index.js');
const resHandler = require('./utils/resHandler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(logger.httpLogger);

app.use('/api', routes);

app.use((_req, res) => res.status(404).json(resHandler.error('404 Not Found')));

app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
