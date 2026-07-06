const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {uploadCsv} = require('../middleware/upload');
const {
    getOverview,
    getInstitutions,
    createInstitution,
    updateInstitution,
    deleteInstitution,
    createUser,
    getAuditTrails,
    getUsers,
    updateUser,
    deleteUser,
    getFinalGrade,
    bulkCreateUsers,
    resetUserPassword,
    getAssignmentOptions,
    getAssignments,
    updateAssignment,
} = require('../controllers/adminController');

router.get('/overview', verifyToken, verifyAdmin, getOverview);
router.get('/institutions', verifyToken, verifyAdmin, getInstitutions);
router.post('/institutions', verifyToken, verifyAdmin, createInstitution);
router.patch('/institutions/:institutionId', verifyToken, verifyAdmin, updateInstitution);
router.delete('/institutions/:institutionId', verifyToken, verifyAdmin, deleteInstitution);
router.post('/users', verifyToken, verifyAdmin, createUser);
router.get('/audit-trails', verifyToken, verifyAdmin, getAuditTrails);
router.get('/users', verifyToken, verifyAdmin, getUsers);
router.patch('/users/:userId', verifyToken, verifyAdmin, updateUser);
router.delete('/users/:userId', verifyToken, verifyAdmin, deleteUser);
router.patch('/users/:userId/reset-password', verifyToken, verifyAdmin, resetUserPassword);
router.get('/assignment-options', verifyToken, verifyAdmin, getAssignmentOptions);
router.get('/assignments', verifyToken, verifyAdmin, getAssignments);
router.patch('/assignments/:studentId', verifyToken, verifyAdmin, updateAssignment);
router.get('/final-grade/:studentId', verifyToken, getFinalGrade);
router.post('/users/bulk-upload', verifyToken, verifyAdmin, uploadCsv.single('csv'), bulkCreateUsers);
module.exports = router;