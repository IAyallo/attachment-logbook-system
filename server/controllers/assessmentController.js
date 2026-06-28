const pool = require('../config/db');

// GET /api/assessments/students — faculty supervisor views their assigned students
const getMyStudents = async (req, res) => {
    const user_id = req.user.id;

    try {
        const faculty = await pool.query(
            'SELECT id FROM faculty_supervisors WHERE user_id = $1', [user_id]
        );
        if (faculty.rows.length === 0) {
            return res.status(403).json({ message: 'Only faculty supervisors can view this.' });
        }

        const result = await pool.query(
            `SELECT s.id, s.reg_number, s.programme, s.attachment_start, s.attachment_end,
                    af.id AS assessment_id, af.status AS assessment_status
             FROM students s
             LEFT JOIN assessment_forms af ON af.student_id = s.id AND af.form_type = 'mid_term'
             WHERE s.faculty_supervisor_id = $1
             ORDER BY s.reg_number ASC`,
            [faculty.rows[0].id]
        );

        res.status(200).json({
            message: 'Assigned students retrieved.',
            count: result.rows.length,
            students: result.rows
        });

    } catch (err) {
        console.error('Get my students error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// POST /api/assessments — faculty supervisor creates/submits an assessment form
// POST /api/assessments — faculty supervisor creates/submits an assessment form (upsert)
const createAssessment = async (req, res) => {
    const { student_id, form_type, faculty_marks, faculty_comments } = req.body;
    const user_id = req.user.id;

    try {
        const faculty = await pool.query(
            'SELECT id FROM faculty_supervisors WHERE user_id = $1', [user_id]
        );
        if (faculty.rows.length === 0) {
            return res.status(403).json({ message: 'Only faculty supervisors can submit assessments.' });
        }

        // Confirm the student is actually assigned to this faculty supervisor
        const student = await pool.query(
            'SELECT id FROM students WHERE id = $1 AND faculty_supervisor_id = $2',
            [student_id, faculty.rows[0].id]
        );
        if (student.rows.length === 0) {
            return res.status(403).json({ message: 'This student is not assigned to you.' });
        }

        const result = await pool.query(
            `INSERT INTO assessment_forms 
                (student_id, faculty_supervisor_id, form_type, faculty_marks, faculty_comments, status, approved_at)
             VALUES ($1, $2, $3, $4, $5, 'approved', NOW())
             ON CONFLICT (student_id, form_type)
             DO UPDATE SET
                faculty_marks = EXCLUDED.faculty_marks,
                faculty_comments = EXCLUDED.faculty_comments,
                faculty_supervisor_id = EXCLUDED.faculty_supervisor_id,
                status = 'approved',
                approved_at = NOW()
             RETURNING *`,
            [student_id, faculty.rows[0].id, form_type, faculty_marks, faculty_comments]
        );

        res.status(201).json({
            message: 'Assessment submitted successfully.',
            assessment: result.rows[0]
        });

    } catch (err) {
        console.error('Create assessment error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { getMyStudents, createAssessment };