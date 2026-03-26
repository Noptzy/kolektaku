const { Router } = require('express');
const auth = require('../../controller/authController');
const { authenticate } = require('../../middleware/authenticate');

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window for auth
  message: { status: 429, message: 'Terlalu banyak percobaan masuk. Silakan coba lagi nanti.' }
});

const route = Router();

route.get('/google', auth.googleLogin);
route.get('/google/callback', auth.googleCallback);
route.get('/google/failed', auth.googleFailed);

route.post('/register', authLimiter, auth.register);
route.post('/login', authLimiter, auth.login);

route.post('/refresh', auth.refresh);
route.post('/logout', authenticate, auth.logout);

route.get('/me', authenticate, auth.me);

module.exports = route;
