const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/authenticate');

// Controllers
const adminAnimeController = require('../../controller/admin/adminAnimeController');
const adminEpisodeController = require('../../controller/admin/adminEpisodeController');
const adminStudioController = require('../../controller/admin/adminStudioController');
const adminVAController = require('../../controller/admin/adminVAController');
const adminCharacterController = require('../../controller/admin/adminCharacterController');
const adminGenreController = require('../../controller/admin/adminGenreController');
const mappingController = require('../../controller/admin/mappingController');
const auditLogController = require('../../controller/admin/auditLogController');

const route = Router();

// All admin routes require authentication + admin role
route.use(authenticate, requireRole(1));

// ─── Stats ───
route.get('/stats', adminAnimeController.getStats);

// ─── Anime ───
route.post('/anime/manual-add', adminAnimeController.manualAddAnime);
route.get('/anime', adminAnimeController.getAll);
route.get('/anime/:id', adminAnimeController.getById);
route.post('/anime', adminAnimeController.createAnime);
route.put('/anime/:id', adminAnimeController.updateAnime);
route.patch('/anime/:id/visibility', adminAnimeController.toggleVisibility);
route.delete('/anime/:id', adminAnimeController.deleteAnime);
route.post('/anime/:id/scrape', adminAnimeController.triggerScrape);
route.post('/anime/manual-add', adminAnimeController.manualAddAnime);

// ─── Episodes ───
route.get('/anime-detail/:animeDetailId/episodes', adminEpisodeController.getEpisodes);
route.post('/anime-detail/:animeDetailId/episodes', adminEpisodeController.createEpisode);
route.put('/episodes/:episodeId', adminEpisodeController.updateEpisode);
route.delete('/episodes/:episodeId', adminEpisodeController.deleteEpisode);

// ─── Episode Sources ───
route.get('/episodes/:episodeId/sources', adminEpisodeController.getSources);
route.post('/episodes/:episodeId/sources', adminEpisodeController.createSource);
route.put('/sources/:sourceId', adminEpisodeController.updateSource);
route.delete('/sources/:sourceId', adminEpisodeController.deleteSource);

// ─── Studio ───
route.get('/studios', adminStudioController.getAll);
route.get('/studios/:id', adminStudioController.getById);
route.post('/studios', adminStudioController.create);
route.put('/studios/:id', adminStudioController.update);
route.delete('/studios/:id', adminStudioController.delete);

// ─── Voice Actor ───
route.get('/vas', adminVAController.getAll);
route.get('/vas/:id', adminVAController.getById);
route.post('/vas', adminVAController.create);
route.put('/vas/:id', adminVAController.update);
route.delete('/vas/:id', adminVAController.delete);

// ─── Character ───
route.get('/characters', adminCharacterController.getAll);
route.get('/characters/:id', adminCharacterController.getById);
route.post('/characters', adminCharacterController.create);
route.put('/characters/:id', adminCharacterController.update);
route.delete('/characters/:id', adminCharacterController.delete);

// ─── Genre ───
route.get('/genres', adminGenreController.getAll);
route.get('/genres/:id', adminGenreController.getById);
route.post('/genres', adminGenreController.create);
route.put('/genres/:id', adminGenreController.update);
route.delete('/genres/:id', adminGenreController.delete);

// ─── Mapping ───
route.get('/mappings', mappingController.getAll);
route.get('/mappings/:id', mappingController.getById);
route.post('/mappings/:id/approve', mappingController.approve);
route.post('/mappings/:id/ignore', mappingController.ignore);
route.post('/mappings/:id/manual', mappingController.manualConnect);
route.post('/mappings/connect/:koleksiId', mappingController.connectAnime);
route.delete('/mappings/connect/:koleksiId', mappingController.disconnectAnime);

// ─── Audit Logs ───
route.get('/audit-logs', auditLogController.getAll);

module.exports = route;
