const pool = require('../config/db');

// POST /api/logs — student creates a log entry
const createLog = async (req, res) => {
    const { title, description, hours_logged, entry_date } = req.body;
    const student_id = req.user.id;

    try {
        // Verify the user is a student
        const student = await pool.query(
            'SELECT id FROM students WHERE user_id = $1', [student_id]
        );
        if (student.rows.length === 0) {
            return res.status(403).json({ message: 'Only students can create log entries.' });
        }

        const result = await pool.query(
            `INSERT INTO logbook_entries 
                (student_id, title, description, hours_logged, entry_date, status, sync_status)
             VALUES ($1, $2, $3, $4, $5, 'draft', 'pending')
             RETURNING *`,
            [student.rows[0].id, title, description, hours_logged, entry_date]
        );

        res.status(201).json({
            message: 'Log entry created successfully.',
            entry: result.rows[0]
        });

    } catch (err) {
        console.error('Create log error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/logs — student views their own log entries
const getLogs = async (req, res) => {
    const user_id = req.user.id;

    try {
        const student = await pool.query(
            'SELECT id FROM students WHERE user_id = $1', [user_id]
        );
        if (student.rows.length === 0) {
            return res.status(403).json({ message: 'Only students can view log entries.' });
        }

        const result = await pool.query(
            `SELECT * FROM logbook_entries 
             WHERE student_id = $1 
             ORDER BY entry_date DESC`,
            [student.rows[0].id]
        );

        res.status(200).json({
            message: 'Log entries retrieved.',
            count: result.rows.length,
            entries: result.rows
        });

    } catch (err) {
        console.error('Get logs error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// PATCH /api/logs/:id/submit — student submits a draft entry
const submitLog = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;

    try {
        const student = await pool.query(
            'SELECT id FROM students WHERE user_id = $1', [user_id]
        );
        if (student.rows.length === 0) {
            return res.status(403).json({ message: 'Only students can submit log entries.' });
        }

        const result = await pool.query(
            `UPDATE logbook_entries 
             SET status = 'submitted', sync_status = 'synced', submitted_at = NOW()
             WHERE id = $1 AND student_id = $2 AND status = 'draft'
             RETURNING *`,
            [id, student.rows[0].id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Entry not found or already submitted.' });
        }

        res.status(200).json({
            message: 'Log entry submitted successfully.',
            entry: result.rows[0]
        });

    } catch (err) {
        console.error('Submit log error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { createLog, getLogs, submitLog };