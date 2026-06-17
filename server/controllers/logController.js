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
// GET /api/logs/pending — host supervisor views logs awaiting approval
const getPendingLogs = async (req, res) => {
    const user_id = req.user.id;

    try {
        const supervisor = await pool.query(
            'SELECT id FROM host_supervisors WHERE user_id = $1', [user_id]
        );
        if (supervisor.rows.length === 0) {
            return res.status(403).json({ message: 'Only host supervisors can view pending logs.' });
        }

        const result = await pool.query(
            `SELECT le.*, s.reg_number 
             FROM logbook_entries le
             JOIN students s ON le.student_id = s.id
             WHERE s.host_supervisor_id = $1 AND le.status = 'submitted'
             ORDER BY le.submitted_at ASC`,
            [supervisor.rows[0].id]
        );

        res.status(200).json({
            message: 'Pending log entries retrieved.',
            count: result.rows.length,
            entries: result.rows
        });

    } catch (err) {
        console.error('Get pending logs error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// PATCH /api/logs/:id/review — host supervisor approves or rejects a log
const reviewLog = async (req, res) => {
    const { id } = req.params;
    const { decision, feedback, marks } = req.body; // decision: 'approved' | 'rejected'
    const user_id = req.user.id;

    if (!['approved', 'rejected'].includes(decision)) {
        return res.status(400).json({ message: "Decision must be 'approved' or 'rejected'." });
    }

    try {
        const supervisor = await pool.query(
            'SELECT id FROM host_supervisors WHERE user_id = $1', [user_id]
        );
        if (supervisor.rows.length === 0) {
            return res.status(403).json({ message: 'Only host supervisors can review logs.' });
        }

        const result = await pool.query(
            `UPDATE logbook_entries le
             SET status = $1, feedback = $2, marks = $3, approved_by = $4, approved_at = NOW()
             FROM students s
             WHERE le.id = $5 
               AND le.student_id = s.id 
               AND s.host_supervisor_id = $4
               AND le.status = 'submitted'
             RETURNING le.*`,
            [decision, feedback || null, marks || null, supervisor.rows[0].id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Entry not found or already reviewed.' });
        }

        // Log to audit trail
        await pool.query(
            `INSERT INTO audit_trails (entry_id, actor_id, action, change_detail)
             VALUES ($1, $2, $3, $4)`,
            [id, user_id, decision, feedback || 'No feedback provided']
        );

        res.status(200).json({
            message: `Log entry ${decision} successfully.`,
            entry: result.rows[0]
        });

    } catch (err) {
        console.error('Review log error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { createLog, getLogs, submitLog, getPendingLogs, reviewLog };
