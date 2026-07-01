const pool = require('../config/db');

// POST /api/reports/upload — student uploads their composite report PDF
const uploadReport = async (req, res) => {
    const user_id = req.user.id;

    if (!req.file) {
        return res.status(400).json({ message: 'No PDF file uploaded.' });
    }

    try {
        const student = await pool.query(
            'SELECT id FROM students WHERE user_id = $1', [user_id]
        );
        if (student.rows.length === 0) {
            return res.status(403).json({ message: 'Only students can upload reports.' });
        }

        const result = await pool.query(
            `INSERT INTO composite_reports (student_id, file_path, file_name, status, submitted_at)
             VALUES ($1, $2, $3, 'submitted', NOW())
             ON CONFLICT (student_id)
             DO UPDATE SET
                file_path = EXCLUDED.file_path,
                file_name = EXCLUDED.file_name,
                status = 'submitted',
                submitted_at = NOW(),
                marks = NULL,
                graded_at = NULL
             RETURNING *`,
            [student.rows[0].id, req.file.path, req.file.originalname]
        );

        res.status(201).json({
            message: 'Composite report uploaded successfully.',
            report: result.rows[0]
        });

    } catch (err) {
        console.error('Upload report error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/reports/my-report — student views their own report status
const getMyReport = async (req, res) => {
    const user_id = req.user.id;

    try {
        const student = await pool.query(
            'SELECT id FROM students WHERE user_id = $1', [user_id]
        );
        if (student.rows.length === 0) {
            return res.status(403).json({ message: 'Only students can view this.' });
        }

        const result = await pool.query(
            'SELECT * FROM composite_reports WHERE student_id = $1',
            [student.rows[0].id]
        );

        res.status(200).json({
            report: result.rows.length > 0 ? result.rows[0] : null
        });

    } catch (err) {
        console.error('Get my report error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/reports/pending — faculty supervisor views reports awaiting grading
const getPendingReports = async (req, res) => {
    const user_id = req.user.id;

    try {
        const faculty = await pool.query(
            'SELECT id FROM faculty_supervisors WHERE user_id = $1', [user_id]
        );
        if (faculty.rows.length === 0) {
            return res.status(403).json({ message: 'Only faculty supervisors can view this.' });
        }

        const result = await pool.query(
            `SELECT cr.*, s.reg_number
             FROM composite_reports cr
             JOIN students s ON cr.student_id = s.id
             WHERE s.faculty_supervisor_id = $1 AND cr.status = 'submitted'
             ORDER BY cr.submitted_at ASC`,
            [faculty.rows[0].id]
        );

        res.status(200).json({ reports: result.rows });

    } catch (err) {
        console.error('Get pending reports error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// PATCH /api/reports/:id/grade — faculty supervisor grades the report
const gradeReport = async (req, res) => {
    const { id } = req.params;
    const { marks, faculty_comments } = req.body;
    const user_id = req.user.id;

    if (marks < 0 || marks > 50) {
        return res.status(400).json({ message: 'Marks must be between 0 and 50.' });
    }

    try {
        const faculty = await pool.query(
            'SELECT id FROM faculty_supervisors WHERE user_id = $1', [user_id]
        );
        if (faculty.rows.length === 0) {
            return res.status(403).json({ message: 'Only faculty supervisors can grade reports.' });
        }

        const result = await pool.query(
            `UPDATE composite_reports cr
             SET marks = $1, faculty_comments = $2, status = 'graded', graded_by = $3, graded_at = NOW()
             FROM students s
             WHERE cr.id = $4 AND cr.student_id = s.id AND s.faculty_supervisor_id = $3
             RETURNING cr.*`,
            [marks, faculty_comments, faculty.rows[0].id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Report not found or not assigned to you.' });
        }

        res.status(200).json({
            message: 'Report graded successfully.',
            report: result.rows[0]
        });

    } catch (err) {
        console.error('Grade report error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { uploadReport, getMyReport, getPendingReports, gradeReport };