const Joi = require('joi');
const resHandler = require('../utils/resHandler');

const validate = (schema) => {
    return (req, res, next) => {
        const validSchema = {};
        const object = {};
        
        if (schema.params) {
            validSchema.params = schema.params;
            object.params = req.params;
        }
        if (schema.query) {
            validSchema.query = schema.query;
            object.query = req.query;
        }
        if (schema.body) {
            validSchema.body = schema.body;
            object.body = req.body;
        }

        const { value, error } = Joi.object(validSchema)
            .prefs({ errors: { label: 'key' }, abortEarly: false })
            .validate(object, { allowUnknown: true });

        if (error) {
            const errorMessage = error.details.map((details) => details.message).join(', ');
            return res.status(400).json(resHandler.error(errorMessage));
        }

        if (value.params) Object.assign(req.params, value.params);
        if (value.query) Object.assign(req.query, value.query);
        if (value.body) Object.assign(req.body, value.body);

        return next();
    };
};

module.exports = validate;
