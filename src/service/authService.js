const bcrypt = require('bcryptjs');
const userRepository = require('../repository/userRepository');
const tokenService = require('./tokenService');
const resHandler = require('../utils/resHandler');

class AuthService {
    async register({ email, name, password }) {
        const existing = await userRepository.findUserByEmail(email);
        if (existing) throw Object.assign(resHandler.error('Email Has Been Taken'), { status: 409 });

        const hashed = await bcrypt.hash(password, 10);
        const user = await userRepository.storeUser({
            email,
            name,
            password: hashed,
        });

        return { id: user.id, email: user.email, name: user.name };
    }

    async handleGoogleUser({ oauthId, email, name, avatarUrl }) {
        let user = await userRepository.findByEmailOrOauthId(email, oauthId);

        if (!user) {
            user = await userRepository.storeGoogleUser({ email, name, oauthId, avatarUrl });
        } else {
            if (!user.oauthId) {
                user = await userRepository.linkGoogle(user.id, oauthId, avatarUrl);
            } else if (!user.avatarUrl && avatarUrl) {
                user = await userRepository.updateUser(user.id, { avatarUrl });
            }
        }

        return tokenService.issueTokens(user);
    }

    async refreshTokens(oldToken) {
        const payload = await tokenService.verifyRefreshToken(oldToken);
        await tokenService.revokeRefreshToken(payload.id);

        const user = await userRepository.findUserById(payload.id);
        if (!user) throw Object.assign(resHandler.error('User Not Found'), { status: 404 });

        return tokenService.issueTokens(user);
    }

    logout(userId) {
        return tokenService.revokeRefreshToken(userId);
    }

    async verifyLocalLogin(email, password) {
        const user = await userRepository.findUserByEmail(email);
        if (!user) throw Object.assign(resHandler.error('Email Not Found'), { status: 401 });

        if (!user.password) throw Object.assign(resHandler.error('This Account Uses Google Login'), { status: 401 });

        const match = await bcrypt.compare(password, user.password);
        if (!match) throw Object.assign(resHandler.error('Password Is Wrong'), { status: 401 });

        return user;
    }

    async issueTokens(user) {
        return tokenService.issueTokens(user);
    }
}

module.exports = new AuthService();
