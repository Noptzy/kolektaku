const { Router } = require('express');
const auth = require('../../controller/authController');
const { authenticate } = require('../../middleware/authenticate');

const route = Router();

route.get('/google', auth.googleLogin);
route.get('/google/callback', auth.googleCallback);
route.get('/google/failed', auth.googleFailed);

route.post('/register', auth.register);
route.post('/login', auth.login);

route.post('/refresh', auth.refresh);
route.post('/logout', authenticate, auth.logout);

route.get('/me', authenticate, auth.me);

module.exports = route;
