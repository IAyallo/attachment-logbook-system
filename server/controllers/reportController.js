const pool = require('../config/db');
const { createNotification } = require('../utils/notifications');

const inferredCategorySql = `
    CASE
      WHEN LOWER(le.title || ' ' || le.description) SIMILAR TO '%(api|backend|database|sql|server)%' THEN 'Backend'
      WHEN LOWER(le.title || ' ' || le.description) SIMILAR TO '%(ui|ux|frontend|react|css|component)%' THEN 'Frontend'
      WHEN LOWER(le.title || ' ' || le.description) SIMILAR TO '%(test|qa|debug|bug|fix)%' THEN 'Testing & QA'
      WHEN LOWER(le.title || ' ' || le.description) SIMILAR TO '%(documentation|report|doc|presentation)%' THEN 'Documentation'
      WHEN LOWER(le.title || ' ' || le.description) SIMILAR TO '%(meeting|client|support|communication)%' THEN 'Professional Practice'
      ELSE 'General'
    END
`;

const reportCategorySql = `COALESCE(le.category::text, ${inferredCategorySql})`;

const getScopedStudents = async (user) => {
    if (user.role === 'student') {
        const result = await pool.query(
            `SELECT id, reg_number, programme FROM students WHERE user_id = $1`,
            [user.id],
        );
        return result.rows;
    }

    if (user.role === 'host_supervisor') {
        const host = await pool.query(
            `SELECT id FROM host_supervisors WHERE user_id = $1`,
            [user.id],
        );
        if (host.rows.length === 0) return [];

        const students = await pool.query(
            `SELECT id, reg_number, programme
             FROM students
             WHERE host_supervisor_id = $1
             ORDER BY reg_number ASC`,
            [host.rows[0].id],
        );
        return students.rows;
    }

    if (user.role === 'faculty_supervisor') {
        const faculty = await pool.query(
            `SELECT id FROM faculty_supervisors WHERE user_id = $1`,
            [user.id],
        );
        if (faculty.rows.length === 0) return [];

        const students = await pool.query(
            `SELECT id, reg_number, programme
             FROM students
             WHERE faculty_supervisor_id = $1
             ORDER BY reg_number ASC`,
            [faculty.rows[0].id],
        );
        return students.rows;
    }

    if (user.role === 'admin') {
        const students = await pool.query(
            `SELECT id, reg_number, programme
             FROM students
             ORDER BY reg_number ASC`,
        );
        return students.rows;
    }

    return [];
};

const getScopedStudentIds = async (user, requestedStudentId) => {
    const students = await getScopedStudents(user);
    if (!requestedStudentId) {
        return students.map((student) => student.id);
    }

    const selected = students.find((student) => student.id === requestedStudentId);
    if (!selected) {
        return null;
    }

    return [selected.id];
};

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
            `SELECT cr.*, s.reg_number, s.programme
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

        const recipient = await pool.query(
            `SELECT u.id AS user_id
             FROM students s
             JOIN users u ON s.user_id = u.id
             WHERE s.id = $1`,
            [result.rows[0].student_id]
        );

        if (recipient.rows.length > 0) {
            await createNotification({
                recipientId: recipient.rows[0].user_id,
                actorId: user_id,
                type: 'report_graded',
                title: 'Composite Report Graded',
                message: `Your composite report was graded (${marks}/50).`,
            });
        }

    } catch (err) {
        console.error('Grade report error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/reports/students — scoped student selector for reports
const getReportStudents = async (req, res) => {
    try {
        const students = await getScopedStudents(req.user);
        res.status(200).json({ students });
    } catch (err) {
        console.error('Get report students error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/reports/weekly — weekly summary report for scoped students
const getWeeklyReport = async (req, res) => {
    const { studentId } = req.query;

    try {
        const scopedIds = await getScopedStudentIds(req.user, studentId);
        if (scopedIds === null) {
            return res.status(403).json({ message: 'You cannot access this student report.' });
        }

        if (scopedIds.length === 0) {
            return res.status(200).json({ weekly: [] });
        }

        const result = await pool.query(
            `SELECT
                DATE_TRUNC('week', le.entry_date)::date AS week_start,
                SUM(le.hours_logged)::numeric(10,2) AS total_hours,
                COUNT(*) AS total_entries,
                COUNT(*) FILTER (WHERE le.status = 'approved') AS approved_entries,
                COUNT(*) FILTER (WHERE le.status = 'submitted') AS submitted_entries,
                CASE
                  WHEN COUNT(*) FILTER (WHERE le.status IN ('approved', 'submitted', 'rejected')) = 0 THEN 0
                  ELSE ROUND(
                    (
                      COUNT(*) FILTER (WHERE le.status = 'approved')::numeric /
                      COUNT(*) FILTER (WHERE le.status IN ('approved', 'submitted', 'rejected'))::numeric
                    ) * 100,
                    2
                  )
                END AS approval_rate
             FROM logbook_entries le
             WHERE le.student_id = ANY($1::uuid[])
             GROUP BY DATE_TRUNC('week', le.entry_date)
             ORDER BY week_start DESC`,
            [scopedIds],
        );

        res.status(200).json({ weekly: result.rows });
    } catch (err) {
        console.error('Get weekly report error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/reports/category-performance — category analytics for scoped students
const getCategoryPerformance = async (req, res) => {
    const { studentId } = req.query;

    try {
        const scopedIds = await getScopedStudentIds(req.user, studentId);
        if (scopedIds === null) {
            return res.status(403).json({ message: 'You cannot access this student report.' });
        }

        if (scopedIds.length === 0) {
            return res.status(200).json({ categories: [] });
        }

        const result = await pool.query(
            `SELECT
                ${reportCategorySql} AS category,
                COUNT(*) AS entries,
                SUM(le.hours_logged)::numeric(10,2) AS total_hours,
                ROUND(AVG(le.marks) FILTER (WHERE le.marks IS NOT NULL), 2) AS average_marks,
                COUNT(*) FILTER (WHERE le.status = 'approved') AS approved_entries
             FROM logbook_entries le
             WHERE le.student_id = ANY($1::uuid[])
             GROUP BY ${reportCategorySql}
             ORDER BY average_marks DESC NULLS LAST, total_hours DESC`,
            [scopedIds],
        );

        res.status(200).json({ categories: result.rows });
    } catch (err) {
        console.error('Get category performance error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/reports/logs-by-category — logs filtered by inferred category for scoped students
const getLogsByCategory = async (req, res) => {
    const { studentId, category } = req.query;

    try {
        const scopedIds = await getScopedStudentIds(req.user, studentId);
        if (scopedIds === null) {
            return res.status(403).json({ message: 'You cannot access this student report.' });
        }

        if (scopedIds.length === 0) {
            return res.status(200).json({ logs: [] });
        }

        const params = [scopedIds];
        let filterClause = '';

        if (category) {
            params.push(category);
            filterClause = ` AND ${reportCategorySql} = $2 `;
        }

        const result = await pool.query(
            `SELECT
                le.id,
                le.entry_date,
                le.title,
                le.description,
                le.hours_logged,
                le.status,
                le.marks,
                s.reg_number,
                     ${reportCategorySql} AS category
             FROM logbook_entries le
             JOIN students s ON le.student_id = s.id
             WHERE le.student_id = ANY($1::uuid[])
             ${filterClause}
             ORDER BY le.entry_date DESC, le.id DESC`,
            params,
        );

        res.status(200).json({ logs: result.rows });
    } catch (err) {
        console.error('Get logs by category error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = {
    uploadReport,
    getMyReport,
    getPendingReports,
    gradeReport,
    getReportStudents,
    getWeeklyReport,
    getCategoryPerformance,
    getLogsByCategory,
};