const jwt = require('jsonwebtoken');
const resHandler = require('../utils/resHandler');

const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) return res.status(401).json(resHandler.error('Token Not Found'));

        const token = header.slice(7);
        const payload = jwt.verify(token, process.env.JWT_ACCESS_TOKEN);
        
        req.user = { id: payload.id, email: payload.email, roleId: payload.roleId };
        next();
    } catch (err) {
        const isExpired = err.name === 'TokenExpiredError';
        res.status(401).json(resHandler.error(isExpired ? 'Token Expired' : 'Invalid Token', { expired: isExpired }));
    }
};

const requireRole =
    (...roleIds) =>
    (req, res, next) => {
        if (!req.user) return res.status(401).json(resHandler.error('Unauthorized'));

        if (!roleIds.includes(req.user.roleId)) return res.status(403).json(resHandler.error('Access Denied'));

        next();
    };

module.exports = { authenticate, requireRole };
