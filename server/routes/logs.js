const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { createLog, getLogs, submitLog } = require('../controllers/logController');

router.post('/', verifyToken, createLog);
router.get('/', verifyToken, getLogs);
router.patch('/:id/submit', verifyToken, submitLog);

module.exports = router;