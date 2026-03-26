const Joi = require('joi');

const getAllUsers = {
    query: Joi.object().keys({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        search: Joi.string().allow('', null)
    })
};

const getUserById = {
    params: Joi.object().keys({
        id: Joi.string().uuid().required()
    })
};

const updateUser = {
    params: Joi.object().keys({
        id: Joi.string().uuid().required()
    }),
    body: Joi.object().keys({
        name: Joi.string().allow('', null),
        email: Joi.string().email(),
        password: Joi.string().min(6),
        avatarUrl: Joi.string().uri().allow('', null),
        roleId: Joi.number().integer()
    }).min(1)
};

const updateUserRole = {
    params: Joi.object().keys({
        id: Joi.string().uuid().required()
    }),
    body: Joi.object().keys({
        roleId: Joi.number().integer().required()
    })
};

const deleteUser = {
    params: Joi.object().keys({
        id: Joi.string().uuid().required()
    })
};

const assignMembership = {
    params: Joi.object().keys({
        id: Joi.string().uuid().required()
    }),
    body: Joi.object().keys({
        planId: Joi.number().integer().required()
    })
};

module.exports = {
    getAllUsers,
    getUserById,
    updateUser,
    updateUserRole,
    deleteUser,
    assignMembership
};
