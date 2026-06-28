const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {
    getOverview,
    getInstitutions,
    createInstitution,
    createUser,
    getAuditTrails,
    getUsers
} = require('../controllers/adminController');

router.get('/overview', verifyToken, verifyAdmin, getOverview);
router.get('/institutions', verifyToken, verifyAdmin, getInstitutions);
router.post('/institutions', verifyToken, verifyAdmin, createInstitution);
router.post('/users', verifyToken, verifyAdmin, createUser);
router.get('/audit-trails', verifyToken, verifyAdmin, getAuditTrails);
router.get('/users', verifyToken, verifyAdmin, getUsers);
module.exports = router;