const passport = require('passport');
const authService = require('../service/authService');
const userRepository = require('../repository/userRepository');
const logger = require('../utils/logger');
const resHandler = require('../utils/resHandler');

const log = logger.createLogger('Auth');

function resolveClientUrl(req) {
    const fallback = 'http://localhost:5173';
    const configured = (process.env.CLIENT_URL || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

    if (!configured.length) return fallback;

    const origin = req.headers.origin;
    if (origin && configured.includes(origin)) {
        return origin;
    }

    return configured[0] || fallback;
}

function resolveGoogleCallbackUrl(req) {
    const forwardedProto = req.headers['x-forwarded-proto']?.split(',')[0]?.trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const host = req.get('host');
    const runtimeCallback = host
        ? `${protocol}://${host}/api/auth/google/callback`
        : process.env.GOOGLE_CALLBACK_URL;

    if (process.env.NODE_ENV !== 'production') {
        return runtimeCallback;
    }

    return process.env.GOOGLE_CALLBACK_URL || runtimeCallback;
}

function extractGoogleFailure(err, info) {
    const oauthRaw = err?.oauthError?.data || '';
    let parsedOAuth = null;

    if (typeof oauthRaw === 'string' && oauthRaw.trim()) {
        try {
            parsedOAuth = JSON.parse(oauthRaw);
        } catch (_ignored) {
            parsedOAuth = null;
        }
    }

    const providerCode = parsedOAuth?.error || null;
    const providerDescription = parsedOAuth?.error_description || null;

    const fallbackMessage = err?.message || info?.message || 'Login failed';
    const message = providerDescription
        ? `${providerCode || 'oauth_error'}: ${providerDescription}`
        : providerCode || fallbackMessage;

    return {
        message,
        meta: {
            errName: err?.name || null,
            errMessage: err?.message || null,
            infoMessage: info?.message || null,
            providerCode,
            providerDescription,
        },
    };
}

const googleLogin = (req, res, next) => {
    const callbackURL = resolveGoogleCallbackUrl(req);
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account',
        session: false,
        callbackURL,
    })(req, res, next);
};

const googleCallback = [
    (req, res, next) => {
        const clientUrl = resolveClientUrl(req);
        const callbackURL = resolveGoogleCallbackUrl(req);
        const hasCode = typeof req.query.code === 'string' && req.query.code.length > 0;

        if (req.query.error) {
            const providerError = String(req.query.error);
            const providerErrorDescription = String(req.query.error_description || '');
            log.warn(`Google OAuth provider rejected request: ${providerError}${providerErrorDescription ? ` - ${providerErrorDescription}` : ''}`);
            return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(providerError)}`);
        }

        if (!hasCode) {
            log.warn(`Google callback hit without authorization code. Redirecting to /api/auth/google | callback=${callbackURL}`);
            return googleLogin(req, res, next);
        }

        passport.authenticate('google', { session: false, callbackURL, scope: ['profile', 'email'] }, (err, user, info) => {
            const failure = extractGoogleFailure(err, info);

            if (err || !user) {
                log.warn(`Google OAuth failed: ${failure.message} | callback=${callbackURL}`, failure.meta);
                return res.redirect(`${clientUrl}/auth/callback?error=${encodeURIComponent(failure.message)}`);
            }

            const { accessToken, refreshToken } = user;
            res.redirect(`${clientUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`);
        })(req, res, next);
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
            if (err) return res.status(500).json(resHandler.error('An Error Occurred'));
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
