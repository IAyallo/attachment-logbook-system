const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const {
  getApprovedInstitutions,
  getMyApplications,
  getMyCurrentAttachment,
  getMyPreviousAttachments,
  submitApplication,
  getPendingApplications,
  reviewApplication,
} = require('../controllers/applicationController');

router.get('/institutions', verifyToken, getApprovedInstitutions);
router.get('/my', verifyToken, getMyApplications);
router.get('/current', verifyToken, getMyCurrentAttachment);
router.get('/previous', verifyToken, getMyPreviousAttachments);
router.post('/', verifyToken, submitApplication);
router.get('/admin', verifyToken, verifyAdmin, getPendingApplications);
router.patch('/admin/:id/review', verifyToken, verifyAdmin, reviewApplication);

module.exports = router;
