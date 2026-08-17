import { Router } from 'express';
import {
  banUser, deleteUser, unbanUser, getAllUsers, deleteProperty, getAllReports,
  wipeAllProperties, resolveReport, getDashboardStats, getVerificationRequests,
  approveVerification, rejectVerification, bulkUpdatePropertyStatus,
  getAllConversations, updateUser, toggleFeatureProperty
} from '../controllers/adminController';

const router = Router();

// Dashboard stats
router.get('/stats', getDashboardStats);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/ban', banUser);
router.put('/users/:id/unban', unbanUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id', updateUser);

// Properties
router.delete('/properties/:id', deleteProperty);
router.post('/properties/bulk-status', bulkUpdatePropertyStatus);
router.delete('/properties/wipe/all', wipeAllProperties);
router.put('/properties/:id/toggle-featured', toggleFeatureProperty);

// Reports
router.get('/reports', getAllReports);
router.put('/reports/:id', resolveReport);

// Verification Requests
router.get('/verifications', getVerificationRequests);
router.put('/verifications/:id/approve', approveVerification);
router.put('/verifications/:id/reject', rejectVerification);

// Conversations
router.get('/conversations', getAllConversations);

export default router;
