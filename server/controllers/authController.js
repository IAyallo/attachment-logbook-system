const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/register
const register = async (req, res) => {
    const { email, password, role } = req.body;

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
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3) RETURNING id, email, role`,
            [email, password_hash, role]
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
    const { email, password } = req.body;

    try {
        // Find user
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1', [email]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // Compare password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Login successful.',
            token,
            user: { id: user.id, email: user.email, role: user.role }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { register, login };
