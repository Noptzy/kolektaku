const { Router } = require('express');

const animeController = require('../../controller/anime/animeController');
const staffController = require('../../controller/anime/staffController');
const studioController = require('../../controller/anime/studioController');
const vaController = require('../../controller/anime/vaController');
const characterController = require('../../controller/anime/characterController');
const genreController = require('../../controller/anime/genreController');

const route = Router();

route.get('/', animeController.getAllAnime);
route.get('/stats', animeController.getGlobalStats);
route.get('/filters', animeController.getFilterOptions);
route.get('/search', animeController.searchAnime);

route.get('/staff/:staffId', staffController.getStaffAnime);
route.get('/studio/:studioId', studioController.getStudioAnime);
route.get('/va/:vaId', vaController.getVAanime);
route.get('/character/:characterId', characterController.getCharacterAnime);
route.get('/genre/:genre', genreController.getAnimeByGenre);

// Episode routes (must be before wildcard :slug)
route.get('/:slug/eps', animeController.getEpisodeList);
route.get('/:slug/eps/:episodeNumber', animeController.getEpisodeStream);

// Wildcard slug route (must be LAST to avoid swallowing other routes)
route.get('/:slug', animeController.getAnimeBySlug);

module.exports = route;

