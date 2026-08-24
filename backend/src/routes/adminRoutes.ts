import { Router } from 'express';
import {
  banUser, deleteUser, unbanUser, getAllUsers, deleteProperty, getAllReports,
  wipeAllProperties, resolveReport, getDashboardStats, getVerificationRequests,
  approveVerification, rejectVerification, bulkUpdatePropertyStatus,
  getAllConversations, updateUser, toggleFeatureProperty
} from '../controllers/adminController';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';

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

// ─── Promote user to Admin role ────────────────────────────────────────────
router.put('/users/:id/promote-admin', async (req: any, res: any) => {
  try {
    const userId = parseInt(req.params.id);
    let adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'Admin' } });
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role_id: adminRole.id },
      include: { role: true },
    });
    res.json({ message: 'تم ترقية المستخدم إلى مشرف بنجاح', user: { id: updated.id, full_name: updated.full_name, role: updated.role.name } });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
});

// ─── Create or ensure Super Admin account exists ────────────────────────────
router.post('/setup-admin', async (req: any, res: any) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name || !phone) {
      return res.status(400).json({ message: 'جميع الحقول مطلوبة: email, password, full_name, phone' });
    }
    let adminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (!adminRole) {
      adminRole = await prisma.role.create({ data: { name: 'Super Admin' } });
    }
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      // Just promote existing user
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role_id: adminRole.id },
        include: { role: true }
      });
      return res.json({ message: 'تم ترقية الحساب الموجود إلى Super Admin', user: { id: updated.id, email: updated.email, role: updated.role.name } });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const newAdmin = await prisma.user.create({
      data: {
        full_name,
        email,
        phone,
        password_hash,
        role_id: adminRole.id,
        governorate: 'الفيوم',
        address: '',
        is_verified: true,
      },
      include: { role: true }
    });
    res.status(201).json({ message: 'تم إنشاء حساب المشرف بنجاح', user: { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role.name } });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
});

export default router;


// Password Reset Requests
router.get('/password-requests', async (req: any, res: any) => {
  try {
    const requests = await prisma.passwordResetRequest.findMany({ orderBy: { created_at: 'desc' } });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'Error fetching requests', error: error.message });
  }
});

router.put('/password-requests/:id/resolve', async (req: any, res: any) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await prisma.passwordResetRequest.update({
      where: { id },
      data: { status: 'resolved' }
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating request', error: error.message });
  }
});

