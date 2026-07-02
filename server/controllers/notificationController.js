const pool = require('../config/db');

// GET /api/notifications
const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);

  try {
    const notifications = await pool.query(
      `SELECT id, type, title, message, is_read, created_at, read_at
       FROM notifications
       WHERE recipient_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );

    const unread = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId],
    );

    res.status(200).json({
      notifications: notifications.rows,
      unread_count: unread.rows[0].count,
    });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/notifications/:id/read
const markNotificationRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND recipient_id = $2
       RETURNING id`,
      [id, userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
  const userId = req.user.id;

  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId],
    );

    res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all notifications read error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
