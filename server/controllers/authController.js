const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
const register = async (req, res) => {
    const { email, password, role, full_name } = req.body;

    try {
        // Check if user already exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1', [email]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Email already registered.' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, role, full_name)
             VALUES ($1, $2, $3, $4) RETURNING id, email, role, full_name`,
            [email, password_hash, role, full_name]
        );

        res.status(201).json({
            message: 'User registered successfully.',
            user: result.rows[0]
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// POST /api/auth/login
const login = async (req, res) => {
    const { identifier, password } = req.body; // identifier = email OR reg_number

    try {
        // Try matching email first, then reg_number via students table
        const result = await pool.query(
            `SELECT u.* FROM users u
             WHERE u.email = $1
             UNION
             SELECT u.* FROM users u
             JOIN students s ON s.user_id = u.id
             WHERE s.reg_number = $1`,
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Fetch role-specific profile info
        let profile = {};

        if (user.role === 'host_supervisor') {
            const hs = await pool.query(
                `SELECT hs.department, hs.job_title, i.name AS institution_name, i.address AS institution_address
                 FROM host_supervisors hs
                 JOIN institutions i ON hs.institution_id = i.id
                 WHERE hs.user_id = $1`,
                [user.id]
            );
            if (hs.rows.length > 0) profile = hs.rows[0];

        } else if (user.role === 'faculty_supervisor') {
            const fs = await pool.query(
                `SELECT department, faculty FROM faculty_supervisors WHERE user_id = $1`,
                [user.id]
            );
            if (fs.rows.length > 0) profile = fs.rows[0];

        } else if (user.role === 'student') {
            const st = await pool.query(
                `SELECT reg_number, programme FROM students WHERE user_id = $1`,
                [user.id]
            );
            if (st.rows.length > 0) profile = st.rows[0];
        }

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name, ...profile }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { register, login };