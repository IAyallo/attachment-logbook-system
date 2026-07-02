const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../controllers/notificationController');

router.get('/', verifyToken, getNotifications);
router.patch('/read-all', verifyToken, markAllNotificationsRead);
router.patch('/:id/read', verifyToken, markNotificationRead);

module.exports = router;
