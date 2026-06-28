const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { createLog, getLogs, submitLog, getPendingLogs, reviewLog } = require('../controllers/logController');

router.post('/', verifyToken, createLog);
router.get('/', verifyToken, getLogs);
router.patch('/:id/submit', verifyToken, submitLog);
router.get('/pending', verifyToken, getPendingLogs);
router.patch('/:id/review', verifyToken, reviewLog);


module.exports = router;