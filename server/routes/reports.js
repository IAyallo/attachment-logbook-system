const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadReport, getMyReport, getPendingReports, gradeReport } = require('../controllers/reportController');

router.post('/upload', verifyToken, upload.single('report'), uploadReport);
router.get('/my-report', verifyToken, getMyReport);
router.get('/pending', verifyToken, getPendingReports);
router.patch('/:id/grade', verifyToken, gradeReport);

module.exports = router;