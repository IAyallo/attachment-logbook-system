const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { getMyStudents, createAssessment } = require('../controllers/assessmentController');

router.get('/students', verifyToken, getMyStudents);
router.post('/', verifyToken, createAssessment);

module.exports = router;