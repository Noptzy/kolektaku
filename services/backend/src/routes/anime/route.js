const { Router } = require('express');

const animeController = require('../../controller/anime/animeController');
const staffController = require('../../controller/anime/staffController');
const studioController = require('../../controller/anime/studioController');
const vaController = require('../../controller/anime/vaController');
const characterController = require('../../controller/anime/characterController');
const genreController = require('../../controller/anime/genreController');

const { authenticate, optionalAuthenticate } = require('../../middleware/authenticate');
const cache = require('../../middleware/cache');
const route = Router();

route.get('/', animeController.getAllAnime);
route.get('/stats', cache(3600), animeController.getGlobalStats);
route.get('/filters', cache(3600), animeController.getFilterOptions);
route.get('/search', animeController.searchAnime);

route.get('/staff/:staffId', cache(600), staffController.getStaffAnime);
route.get('/studio/:studioId', cache(600), studioController.getStudioAnime);
route.get('/va/:vaId', cache(600), vaController.getVAanime);
route.get('/character/:characterId', cache(600), characterController.getCharacterAnime);
route.get('/genre/:genre', cache(300), genreController.getAnimeByGenre);

route.get('/:slug/eps', optionalAuthenticate, cache(300), animeController.getEpisodeList);
route.get('/:slug/eps/:episodeNumber', authenticate, cache(300), animeController.getEpisodeStream);

route.get('/recommendations', authenticate, animeController.getRecommendations);

route.get('/random', cache(60), animeController.getRandomAnime);
route.get('/recently-updated', cache(300), animeController.getRecentlyUpdated);
route.get('/most-watched', cache(600), animeController.getMostWatched);

route.get('/:slug', cache(600), animeController.getAnimeBySlug);

module.exports = route;

