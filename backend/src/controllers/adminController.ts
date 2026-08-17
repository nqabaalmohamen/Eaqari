import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

// Ban user
export const banUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      res.status(404).json({ message: 'المستخدم غير موجود' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(400).json({ message: 'المستخدم محظور بالفعل' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'suspended' },
    });

    res.json({ message: 'تم حظر المستخدم بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      res.status(404).json({ message: 'المستخدم غير موجود' });
      return;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'تم حذف حساب المستخدم نهائياً' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Unban user
export const unbanUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string);
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
    });
    res.json({ message: 'تم فك الحظر عن المستخدم بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Get all users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: { select: { name: true } },
        properties: { select: { id: true } },
        _count: {
          select: { properties: true, favorites: true, reportsFiled: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    const flatUsers = users.map(u => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role?.name || 'User',
      status: u.status,
      governorate: u.governorate,
      city: u.city,
      address: u.address,
      is_verified: u.is_verified,
      created_at: u.created_at,
      updated_at: u.updated_at,
      properties: u.properties,
      _count: u._count
    }));
    res.json(flatUsers);
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Delete property
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    await prisma.propertyMedia.deleteMany({ where: { property_id: propertyId } });
    await prisma.propertyFeature.deleteMany({ where: { property_id: propertyId } });
    await prisma.favorite.deleteMany({ where: { property_id: propertyId } });
    await prisma.report.deleteMany({ where: { property_id: propertyId } });
    await prisma.conversation.deleteMany({ where: { property_id: propertyId } });
    await prisma.transaction.deleteMany({ where: { property_id: propertyId } });
    await prisma.property.delete({ where: { id: propertyId } });
    res.json({ message: 'تم حذف الإعلان نهائياً' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Wipe ALL properties (full reset)
export const wipeAllProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const { confirm } = req.body;
    if (!confirm || confirm !== 'WIPE_ALL_PROPERTIES') {
      res.status(400).json({ message: 'تأكيد المسح مطلوب' });
      return;
    }
    await prisma.$transaction([
      prisma.propertyMedia.deleteMany(),
      prisma.propertyFeature.deleteMany(),
      prisma.favorite.deleteMany(),
      prisma.report.deleteMany(),
      prisma.message.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.commission.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.transaction.deleteMany(),
      prisma.property.deleteMany(),
    ]);
    res.json({ message: 'تم مسح جميع الإعلانات والبيانات المرتبطة بها بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Get all reports
export const getAllReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        property: { select: { id: true, description: true, type: true, status: true } },
        reporter: { select: { id: true, full_name: true, phone: true, email: true } },
        reported_user: { select: { id: true, full_name: true, phone: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Resolve a report
export const resolveReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const reportId = parseInt(req.params.id as string);
    const { status, admin_notes } = req.body;
    const validStatuses = ['pending', 'reviewed', 'resolved'];
    const resolvedStatus = validStatuses.includes(status) ? status : 'resolved';
    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status: resolvedStatus, admin_notes: admin_notes || '' }
    });
    res.json({ message: 'تم تحديث حالة البلاغ بنجاح', report: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Get platform dashboard statistics
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      usersCount,
      activeUsersCount,
      suspendedUsersCount,
      verifiedUsersCount,
      propertiesCount,
      activePropertiesCount,
      pendingPropertiesCount,
      soldPropertiesCount,
      rentedPropertiesCount,
      reportsCount,
      pendingReportsCount,
      conversationsCount,
      transactionsCount,
      totalVolumeSum
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { is_verified: true } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'active' } }),
      prisma.property.count({ where: { status: 'pending' } }),
      prisma.property.count({ where: { status: 'sold' } }),
      prisma.property.count({ where: { status: 'rented' } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.conversation.count(),
      prisma.transaction.count(),
      prisma.transaction.aggregate({ _sum: { amount: true } }).then(r => r._sum.amount || 0),
    ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: { id: true, full_name: true, phone: true, created_at: true }
    });

    const recentProperties = await prisma.property.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        owner: { select: { full_name: true } },
        media: { take: 1, select: { media_url: true } }
      }
    });

    res.json({
      users: {
        total: usersCount,
        active: activeUsersCount,
        suspended: suspendedUsersCount,
        verified: verifiedUsersCount
      },
      properties: {
        total: propertiesCount,
        active: activePropertiesCount,
        pending: pendingPropertiesCount,
        sold: soldPropertiesCount,
        rented: rentedPropertiesCount
      },
      reports: {
        total: reportsCount,
        pending: pendingReportsCount
      },
      conversations: conversationsCount,
      transactions: {
        count: transactionsCount,
        total_volume: Number(totalVolumeSum)
      },
      recent_users: recentUsers,
      recent_properties: recentProperties
    });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Get all verification requests
export const getVerificationRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const requests = await prisma.verificationRequest.findMany({
      include: {
        user: { select: { id: true, full_name: true, phone: true, email: true, is_verified: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Approve verification request
export const approveVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = parseInt(req.params.id as string);
    const adminId = (req as any).adminId || 1;
    const vreq = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });
    if (!vreq) {
      res.status(404).json({ message: 'طلب التحقق غير موجود' });
      return;
    }
    await prisma.$transaction([
      prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: 'approved', reviewed_by: adminId }
      }),
      prisma.user.update({
        where: { id: vreq.user_id },
        data: { is_verified: true }
      })
    ]);
    res.json({ message: 'تم الموافقة على طلب التحقق بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Reject verification request
export const rejectVerification = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = parseInt(req.params.id as string);
    const adminId = (req as any).adminId || 1;
    await prisma.verificationRequest.update({
      where: { id: requestId },
      data: { status: 'rejected', reviewed_by: adminId }
    });
    res.json({ message: 'تم رفض طلب التحقق' });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Bulk update property status
export const bulkUpdatePropertyStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status, rejection_reason } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'قائمة المعرفات مطلوبة' });
      return;
    }
    if (!['active', 'pending', 'rejected', 'sold', 'rented'].includes(status)) {
      res.status(400).json({ message: 'حالة غير صالحة' });
      return;
    }
    const data: any = { status };
    if (status === 'rejected') {
      data.rejection_reason = rejection_reason || 'لا يوجد سبب مذكور';
    } else if (status === 'active' || status === 'sold' || status === 'rented') {
      data.rejection_reason = null;
    }
    const updated = await prisma.property.updateMany({
      where: { id: { in: ids.map(Number) } },
      data
    });
    res.json({ message: `تم تحديث ${updated.count} إعلان بنجاح` });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Get all conversations
export const getAllConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        owner: { select: { id: true, full_name: true, phone: true } },
        buyer: { select: { id: true, full_name: true, phone: true } },
        property: { select: { id: true, description: true, price: true, type: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { content: true, created_at: true, is_read: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(conversations);
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Update a user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.id as string);
    const { full_name, phone, email, role_id, status, is_verified, governorate, city, address } = req.body;

    const data: any = {};
    if (full_name !== undefined) data.full_name = full_name;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (role_id !== undefined) data.role_id = Number(role_id);
    if (status !== undefined) data.status = status;
    if (is_verified !== undefined) data.is_verified = Boolean(is_verified);
    if (governorate !== undefined) data.governorate = governorate;
    if (city !== undefined) data.city = city;
    if (address !== undefined) data.address = address;

    const updated = await prisma.user.update({
      where: { id: userId },
      data
    });
    res.json({ message: 'تم تحديث بيانات المستخدم بنجاح', user: updated });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};

// Feature a property
export const toggleFeatureProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const propertyId = parseInt(req.params.id as string);
    const prop = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!prop) {
      res.status(404).json({ message: 'الإعلان غير موجود' });
      return;
    }
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: { is_featured: !prop.is_featured }
    });
    res.json({ message: `تم ${updated.is_featured ? 'تمييز' : 'إلغاء تمييز'} الإعلان بنجاح`, is_featured: updated.is_featured });
  } catch (error: any) {
    res.status(500).json({ message: 'خطأ في السيرفر', error: error.message });
  }
};
