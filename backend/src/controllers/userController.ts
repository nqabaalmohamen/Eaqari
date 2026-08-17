import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const completeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, full_name, phone, governorate, city, address } = req.body;
    
    if (!email || !full_name || !phone) {
      res.status(400).json({ message: 'الاسم ورقم الهاتف والبريد الإلكتروني مطلوبين' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: 'المستخدم غير موجود' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        full_name,
        phone,
        governorate: governorate || user.governorate,
        city: city || user.city,
        address: address || user.address,
      },
      include: { role: true }
    });

    res.json({
      message: 'تم استكمال البيانات بنجاح',
      user: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role.name,
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
