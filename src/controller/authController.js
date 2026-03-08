const passport = require('passport');
const authService = require('../service/authService');
const userRepository = require('../repository/userRepository');
const logger = require('../utils/logger');
const resHandler = require('../utils/resHandler');

const log = logger.createLogger('Auth');

const googleLogin = passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    session: false,
});

const googleCallback = [
    passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failed' }),
    (req, res) => {
        const { accessToken, refreshToken } = req.user;
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${clientUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
    },
];

const googleFailed = (_req, res) => res.status(401).json(resHandler.error('Google Login Failed or Cancelled'));

const register = async (req, res) => {
    try {
        const { email, name, password } = req.body;

        if (!email || !password) return res.status(400).json(resHandler.error('Email and Password Are Required'));

        const newUser = await authService.register({ email, name, password });
        log.info(`Registered: ${email}`);
        res.status(201).json(resHandler.success('Registered Successfully', newUser));
    } catch (err) {
        log.warn(`Register failed: ${err.message}`);
        res.status(err.status || 500).json(resHandler.error(err.message));
    }
};

const login = [
    (req, res, next) => {
        passport.authenticate('local', { session: false }, async (err, user, info) => {
            if (err) return res.status(500).json(resHandler.error('Terjadi kesalahan'));
            if (!user) return res.status(401).json(resHandler.error(info?.message || 'Login Failed'));

            try {
                const tokens = await authService.issueTokens(user);
                log.info(`Login: ${user.email}`);
                res.json(resHandler.success('Login Successfully', tokens));
            } catch (e) {
                res.status(500).json(resHandler.error('Failed to Issue Token'));
            }
        })(req, res, next);
    },
];

const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(400).json(resHandler.error('Refresh Token Is Required'));

        const tokens = await authService.refreshTokens(refreshToken);
        res.json(resHandler.success('Token Successfully Refreshed', tokens));
    } catch (err) {
        res.status(err.status || 401).json(resHandler.error(err.message));
    }
};

const logout = async (req, res) => {
    try {
        await authService.logout(req.user.id);
        log.info(`Logout: ${req.user.id}`);
        res.json(resHandler.success('Logout Successfully'));
    } catch (err) {
        res.status(500).json(resHandler.error('Failed to Logout'));
    }
};

const me = async (req, res) => {
    try {
        const user = await userRepository.findUserById(req.user.id);
        if (!user) return res.status(404).json(resHandler.error('User Not Found'));

        const { password: _, ...safe } = user;
        res.json(resHandler.success('Profile Successfully Retrieved', safe));
    } catch (err) {
        res.status(500).json(resHandler.error('Failed to Retrieve Profile'));
    }
};

module.exports = { googleLogin, googleCallback, googleFailed, register, login, refresh, logout, me };
