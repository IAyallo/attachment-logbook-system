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
// GET /api/logs/host-score/:studentId — calculate auto-average host score for a student
const getHostScore = async (req, res) => {
    const { studentId } = req.params;
    const user_id = req.user.id;

    try {
        const supervisor = await pool.query(
            'SELECT id FROM host_supervisors WHERE user_id = $1', [user_id]
        );
        if (supervisor.rows.length === 0) {
            return res.status(403).json({ message: 'Only host supervisors can view this.' });
        }

        // Confirm student belongs to this supervisor
        const studentCheck = await pool.query(
            'SELECT id FROM students WHERE id = $1 AND host_supervisor_id = $2',
            [studentId, supervisor.rows[0].id]
        );
        if (studentCheck.rows.length === 0) {
            return res.status(403).json({ message: 'This student is not assigned to you.' });
        }

        // Average of all approved log marks (already stored as out-of-20 values)
        const avgResult = await pool.query(
            `SELECT 
                COALESCE(ROUND(AVG(marks), 2), 0) AS average_score,
                COUNT(*) AS graded_logs_count
             FROM logbook_entries
             WHERE student_id = $1 AND status = 'approved' AND marks IS NOT NULL`,
            [studentId]
        );

        // Check if supervisor already overrode this score
        const override = await pool.query(
            `SELECT host_marks, host_comments FROM assessment_forms 
             WHERE student_id = $1 AND form_type = 'host_score'`,
            [studentId]
        );

        res.status(200).json({
            calculated_average: parseFloat(avgResult.rows[0].average_score),
            graded_logs_count: parseInt(avgResult.rows[0].graded_logs_count),
            override: override.rows.length > 0 ? override.rows[0] : null
        });

    } catch (err) {
        console.error('Get host score error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// POST /api/logs/host-score/:studentId — host supervisor overrides the final host score
const setHostScoreOverride = async (req, res) => {
    const { studentId } = req.params;
    const { host_marks, host_comments } = req.body;
    const user_id = req.user.id;

    if (host_marks < 0 || host_marks > 20) {
        return res.status(400).json({ message: 'Host marks must be between 0 and 20.' });
    }

    try {
        const supervisor = await pool.query(
            'SELECT id FROM host_supervisors WHERE user_id = $1', [user_id]
        );
        if (supervisor.rows.length === 0) {
            return res.status(403).json({ message: 'Only host supervisors can set this.' });
        }

        const result = await pool.query(
            `INSERT INTO assessment_forms (student_id, host_supervisor_id, form_type, host_marks, host_comments, status, approved_at)
             VALUES ($1, $2, 'host_score', $3, $4, 'approved', NOW())
             ON CONFLICT (student_id, form_type)
             DO UPDATE SET
                host_marks = EXCLUDED.host_marks,
                host_comments = EXCLUDED.host_comments,
                host_supervisor_id = EXCLUDED.host_supervisor_id,
                status = 'approved',
                approved_at = NOW()
             RETURNING *`,
            [studentId, supervisor.rows[0].id, host_marks, host_comments]
        );

        res.status(200).json({
            message: 'Host score finalized successfully.',
            assessment: result.rows[0]
        });

    } catch (err) {
        console.error('Set host score error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/logs/my-students — host supervisor views their assigned students
const getMyHostStudents = async (req, res) => {
    const user_id = req.user.id;

    try {
        const supervisor = await pool.query(
            'SELECT id FROM host_supervisors WHERE user_id = $1', [user_id]
        );
        if (supervisor.rows.length === 0) {
            return res.status(403).json({ message: 'Only host supervisors can view this.' });
        }

        const result = await pool.query(
            `SELECT s.id, s.reg_number, s.programme,
                    COUNT(le.id) FILTER (WHERE le.status = 'approved') AS approved_logs,
                    COUNT(le.id) FILTER (WHERE le.status = 'submitted') AS pending_logs
             FROM students s
             LEFT JOIN logbook_entries le ON le.student_id = s.id
             WHERE s.host_supervisor_id = $1
             GROUP BY s.id
             ORDER BY s.reg_number ASC`,
            [supervisor.rows[0].id]
        );

        res.status(200).json({ students: result.rows });

    } catch (err) {
        console.error('Get my host students error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { createLog, getLogs, submitLog, getPendingLogs, reviewLog, getHostScore, setHostScoreOverride, getMyHostStudents };

