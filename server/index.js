const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./config/db');
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');
const assessmentRoutes = require('./routes/assessments');
const adminRoutes = require('./routes/admin');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//Middleware
app.use(cors());
app.use(express.json());

//Health Check Route
app.get('/', (req, res) => res.json({ message: 'logbook API running' }));
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/admin', adminRoutes);

//Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));