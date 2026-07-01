const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const {
	uploadReport,
	getMyReport,
	getPendingReports,
	gradeReport,
	getReportStudents,
	getWeeklyReport,
	getCategoryPerformance,
	getLogsByCategory,
} = require('../controllers/reportController');

router.post('/upload', verifyToken, upload.single('report'), uploadReport);
router.get('/my-report', verifyToken, getMyReport);
router.get('/pending', verifyToken, getPendingReports);
router.patch('/:id/grade', verifyToken, gradeReport);
router.get('/students', verifyToken, getReportStudents);
router.get('/weekly', verifyToken, getWeeklyReport);
router.get('/category-performance', verifyToken, getCategoryPerformance);
router.get('/logs-by-category', verifyToken, getLogsByCategory);

module.exports = router;