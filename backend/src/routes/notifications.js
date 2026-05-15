const express = require('express');
const { verifyToken } = require('../middleware');
const notificationController = require('../controllers/notificationController');

const router = express.Router();

router.get('/', verifyToken, notificationController.list);
router.get('/unread-count', verifyToken, notificationController.unreadCount);
router.put('/:id/read', verifyToken, notificationController.markRead);
router.put('/read-all', verifyToken, notificationController.markAllRead);
router.delete('/:id', verifyToken, notificationController.remove);

module.exports = router;
