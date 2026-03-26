const { Router } = require('express');

const meController = require('../../controller/meController');
const { authenticate } = require('../../middleware/authenticate');

const route = Router();

route.use(authenticate);

route.get('/billing', meController.getBilling);

route.get('/favorites', meController.getFavorites);
route.post('/favorites/:koleksiId', meController.addFavorite);
route.delete('/favorites/:koleksiId', meController.removeFavorite);

route.get('/history/watch', meController.getWatchHistory);
route.get('/history/watch/:episodeId', meController.getWatchHistoryByEpisode);
route.post('/history/watch', meController.saveWatchHistory);
route.get('/history/read', meController.getReadHistory);
route.post('/history/read', meController.saveReadHistory);

route.get('/notifications', meController.getNotifications);
route.patch('/notifications/:notificationId/read', meController.markNotificationRead);
route.patch('/notifications/read-all', meController.markAllNotificationsRead);

module.exports = route;
