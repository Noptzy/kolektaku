const keyService = require('../service/keyService');
const resHandler = require('../utils/resHandler');

exports.getBalance = async (req, res) => {
    try {
        const result = await keyService.getBalance(req.user.id);
        res.status(200).json(resHandler.success('Key balance', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to get key balance'));
    }
};

exports.addFromAd = async (req, res) => {
    try {
        const result = await keyService.addKeysFromAd(req.user.id);
        res.status(200).json(resHandler.success('Keys added from ad', result));
    } catch (error) {
        res.status(500).json(resHandler.error('Failed to add keys'));
    }
};

exports.purchase = async (req, res) => {
    try {
        const { quantity } = req.body;
        const result = await keyService.purchaseKeys(req.user.id, parseInt(quantity));
        res.status(200).json(resHandler.success('Keys purchased', result));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to purchase keys'));
    }
};

exports.consume = async (req, res) => {
    try {
        const result = await keyService.consumeKey(req.user.id);
        res.status(200).json(resHandler.success('Key consumed', result));
    } catch (error) {
        res.status(error.status || 500).json(resHandler.error(error.message || 'Failed to consume key'));
    }
};
