const { Router } = require('express');
const searchController = require('../../controller/search/searchController');

const route = Router();

route.get('/', searchController.searchAll);

module.exports = route;
