const { Router } = require('express');
const { authenticate, requireRole } = require('../../middleware/authenticate');

const adminAnimeController = require('../../controller/admin/adminAnimeController');
const adminEpisodeController = require('../../controller/admin/adminEpisodeController');
const adminStudioController = require('../../controller/admin/adminStudioController');
const adminVAController = require('../../controller/admin/adminVAController');
const adminCharacterController = require('../../controller/admin/adminCharacterController');
const adminGenreController = require('../../controller/admin/adminGenreController');
const mappingController = require('../../controller/admin/mappingController');
const auditLogController = require('../../controller/admin/auditLogController');
const adminBroadcastController = require('../../controller/admin/adminBroadcastController');
const airingScheduleController = require('../../controller/admin/airingScheduleController');
const scheduleSyncController = require('../../controller/scheduleSyncController');
const adminAnalyticsController = require('../../controller/admin/adminAnalyticsController');

const adminTransactionController = require('../../controller/admin/adminTransactionController');

const route = Router();

route.use(authenticate, requireRole(1));

route.get('/stats', adminAnimeController.getStats);
route.get('/transactions', adminTransactionController.getAll);

route.get('/broadcasts', adminBroadcastController.getBroadcasts);
route.post('/broadcasts', adminBroadcastController.createBroadcast);

route.post('/schedules/fetch', airingScheduleController.triggerFetch);

route.post('/anime/manual-add', adminAnimeController.manualAddAnime);
route.get('/anime/filter-options', adminAnimeController.getFilterOptions);
route.get('/anime', adminAnimeController.getAll);
route.get('/anime/:id', adminAnimeController.getById);
route.post('/anime', adminAnimeController.createAnime);
route.put('/anime/:id', adminAnimeController.updateAnime);
route.patch('/anime/:id/visibility', adminAnimeController.toggleVisibility);
route.delete('/anime/:id', adminAnimeController.deleteAnime);
route.post('/anime/:id/scrape', adminAnimeController.triggerScrape);
route.post('/anime/batch-map', adminAnimeController.triggerBatchMapping);
route.post('/anime/manual-add', adminAnimeController.manualAddAnime);

route.get('/anime-detail/:animeDetailId/episodes', adminEpisodeController.getEpisodes);
route.post('/anime-detail/:animeDetailId/episodes', adminEpisodeController.createEpisode);
route.delete('/anime-detail/:animeDetailId/episodes', adminEpisodeController.deleteAllEpisodes);
route.put('/episodes/:episodeId', adminEpisodeController.updateEpisode);
route.delete('/episodes/:episodeId', adminEpisodeController.deleteEpisode);

route.get('/episodes/:episodeId/sources', adminEpisodeController.getSources);
route.post('/episodes/:episodeId/sources', adminEpisodeController.createSource);
route.put('/sources/:sourceId', adminEpisodeController.updateSource);
route.delete('/sources/:sourceId', adminEpisodeController.deleteSource);

route.get('/studios', adminStudioController.getAll);
route.get('/studios/:id', adminStudioController.getById);
route.post('/studios', adminStudioController.create);
route.put('/studios/:id', adminStudioController.update);
route.delete('/studios/:id', adminStudioController.delete);

route.get('/vas', adminVAController.getAll);
route.get('/vas/:id', adminVAController.getById);
route.post('/vas', adminVAController.create);
route.put('/vas/:id', adminVAController.update);
route.delete('/vas/:id', adminVAController.delete);

route.get('/characters', adminCharacterController.getAll);
route.get('/characters/:id', adminCharacterController.getById);
route.post('/characters', adminCharacterController.create);
route.put('/characters/:id', adminCharacterController.update);
route.delete('/characters/:id', adminCharacterController.delete);

route.get('/genres', adminGenreController.getAll);
route.get('/genres/:id', adminGenreController.getById);
route.post('/genres', adminGenreController.create);
route.put('/genres/:id', adminGenreController.update);
route.delete('/genres/:id', adminGenreController.delete);

route.get('/mappings', mappingController.getAll);
route.get('/mappings/:id', mappingController.getById);
route.post('/mappings/bulk-approve', mappingController.bulkApprove);
route.post('/mappings/bulk-ignore', mappingController.bulkIgnore);
route.post('/mappings/:id/approve', mappingController.approve);
route.post('/mappings/:id/ignore', mappingController.ignore);
route.post('/mappings/:id/manual', mappingController.manualConnect);
route.post('/mappings/connect/:koleksiId', mappingController.connectAnime);
route.delete('/mappings/connect/:koleksiId', mappingController.disconnectAnime);

route.get('/audit-logs', auditLogController.getAll);

route.get('/sync/schedule', scheduleSyncController.sync);

route.get('/analytics/top-favorited', adminAnalyticsController.getTopFavorited);
route.get('/analytics/top-watched', adminAnalyticsController.getTopWatched);
route.get('/analytics/top-episodes', adminAnalyticsController.getTopEpisodes);
route.get('/analytics/growth', adminAnalyticsController.getGrowthStats);

module.exports = route;
