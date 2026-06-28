const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /api/admin/overview — dashboard stats
const getOverview = async (req, res) => {
    try {
        const totalHours = await pool.query(
            `SELECT COALESCE(SUM(hours_logged), 0) AS total FROM logbook_entries WHERE status = 'approved'`
        );

        const syncStats = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE sync_status = 'synced') AS synced,
                COUNT(*) AS total
             FROM logbook_entries`
        );

        const activeSupervisors = await pool.query(
            `SELECT COUNT(*) AS count FROM host_supervisors`
        );

        const institutionCount = await pool.query(
            `SELECT COUNT(*) AS count FROM institutions`
        );

        const synced = parseInt(syncStats.rows[0].synced);
        const total = parseInt(syncStats.rows[0].total);
        const syncRate = total > 0 ? ((synced / total) * 100).toFixed(2) : '100.00';

        res.status(200).json({
            total_hours_logged: parseFloat(totalHours.rows[0].total),
            sync_success_rate: syncRate,
            active_supervisors: parseInt(activeSupervisors.rows[0].count),
            total_institutions: parseInt(institutionCount.rows[0].count)
        });

    } catch (err) {
        console.error('Get overview error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/admin/institutions
const getInstitutions = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT i.*, 
                COUNT(DISTINCT s.id) AS assigned_students
             FROM institutions i
             LEFT JOIN students s ON s.institution_id = i.id
             GROUP BY i.id
             ORDER BY i.registered_at DESC`
        );

        res.status(200).json({ institutions: result.rows });

    } catch (err) {
        console.error('Get institutions error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// POST /api/admin/institutions — register a new institution
const createInstitution = async (req, res) => {
    const { name, address, contact_person, contact_email } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO institutions (name, address, contact_person, contact_email)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [name, address, contact_person, contact_email]
        );

        res.status(201).json({
            message: 'Institution registered successfully.',
            institution: result.rows[0]
        });

    } catch (err) {
        console.error('Create institution error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// POST /api/admin/users — onboard a new user (any role)
const createUser = async (req, res) => {
    const { email, password, role, full_name } = req.body;

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, role, full_name)
             VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name`,
            [email, password_hash, role, full_name]
        );

        res.status(201).json({
            message: 'User created successfully.',
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// GET /api/admin/audit-trails — recent activity feed
const getAuditTrails = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT at.*, u.full_name, u.email
             FROM audit_trails at
             JOIN users u ON at.actor_id = u.id
             ORDER BY at.performed_at DESC
             LIMIT 20`
        );

        res.status(200).json({ audit_trails: result.rows });

    } catch (err) {
        console.error('Get audit trails error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};
// GET /api/admin/users — list all users with role-specific info
const getUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
                    s.reg_number, 
                    hs.job_title AS host_job_title,
                    fs.department AS faculty_department
             FROM users u
             LEFT JOIN students s ON s.user_id = u.id
             LEFT JOIN host_supervisors hs ON hs.user_id = u.id
             LEFT JOIN faculty_supervisors fs ON fs.user_id = u.id
             ORDER BY u.created_at DESC`
        );

        res.status(200).json({ users: result.rows });

    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { getOverview, getInstitutions, createInstitution, createUser, getAuditTrails, getUsers };