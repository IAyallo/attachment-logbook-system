const pool = require('../config/db');

const createNotification = async ({ recipientId, actorId = null, type, title, message }) => {
  if (!recipientId) return;

  try {
    await pool.query(
      `INSERT INTO notifications (recipient_id, actor_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [recipientId, actorId, type, title, message],
    );
  } catch (err) {
    console.error('Create notification error:', err);
  }
};

module.exports = { createNotification };
