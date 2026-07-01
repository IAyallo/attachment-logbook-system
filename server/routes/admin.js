const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {uploadCsv} = require('../middleware/upload');
const {
    getOverview,
    getInstitutions,
    createInstitution,
    createUser,
    getAuditTrails,
    getUsers,
    getFinalGrade,
    bulkCreateUsers,
    getAssignmentOptions,
    getAssignments,
    updateAssignment,
} = require('../controllers/adminController');

router.get('/overview', verifyToken, verifyAdmin, getOverview);
router.get('/institutions', verifyToken, verifyAdmin, getInstitutions);
router.post('/institutions', verifyToken, verifyAdmin, createInstitution);
router.post('/users', verifyToken, verifyAdmin, createUser);
router.get('/audit-trails', verifyToken, verifyAdmin, getAuditTrails);
router.get('/users', verifyToken, verifyAdmin, getUsers);
router.get('/assignment-options', verifyToken, verifyAdmin, getAssignmentOptions);
router.get('/assignments', verifyToken, verifyAdmin, getAssignments);
router.patch('/assignments/:studentId', verifyToken, verifyAdmin, updateAssignment);
router.get('/final-grade/:studentId', verifyToken, getFinalGrade);
router.post('/users/bulk-upload', verifyToken, verifyAdmin, uploadCsv.single('csv'), bulkCreateUsers);
module.exports = router;