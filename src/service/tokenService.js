const jwt = require('jsonwebtoken');
const redis = require('../config/redisUpstash');

const ACCESS_SECRET = process.env.JWT_ACCESS_TOKEN;
const REFRESH_SECRET = process.env.JWT_REFRESH_TOKEN;
const ACCESS_TTL = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TTL = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const REFRESH_TTL_S = 7 * 24 * 60 * 60;

class TokenService {
    signAccessToken(user) {
        return jwt.sign({ id: user.id, email: user.email, roleId: user.roleId }, ACCESS_SECRET, {
            expiresIn: ACCESS_TTL,
        });
    }

    async signRefreshToken(userId) {
        const token = jwt.sign({ id: userId }, REFRESH_SECRET, { expiresIn: REFRESH_TTL });
        await redis.set(`refresh_token:${userId}`, token, { ex: REFRESH_TTL_S });
        return token;
    }

    async verifyRefreshToken(token) {
        const payload = jwt.verify(token, REFRESH_SECRET);
        const stored = await redis.get(`refresh_token:${payload.id}`);

        if (!stored || stored !== token)
            throw Object.assign(new Error('Refresh Token is Invalid or Expired'), { status: 401 });

        return payload;
    }

    revokeRefreshToken(userId) {
        return redis.del(`refresh_token:${userId}`);
    }

    async issueTokens(user) {
        return {
            accessToken: this.signAccessToken(user),
            refreshToken: await this.signRefreshToken(user.id),
        };
    }
}

module.exports = new TokenService();
