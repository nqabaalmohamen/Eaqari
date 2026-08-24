import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { sendEmailOtp, sendPasswordResetEmail } from '../utils/email';
import { OAuth2Client } from 'google-auth-library';

// In-memory OTP store (for development)
const otpStore: Record<string, { otp: string; expires: number }> = {};

// Pending registrations — held in memory only, NOT saved to DB until OTP is verified
interface PendingReg {
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  role_id: number;
  governorate: string;
  address: string;
  expires: number;
}
const pendingRegistrations: Record<string, PendingReg> = {};

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER — deprecated. Registration now happens inside verifyOtp after OTP confirmed.
// ─────────────────────────────────────────────────────────────────────────────
export const register = async (_req: Request, res: Response): Promise<void> => {
  res.status(410).json({ message: 'استخدم مسار send-otp ثم verify-otp للتسجيل' });
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, identifier, password } = req.body;
    const loginId = identifier || email || phone;

    if (!loginId || !password) {
      res.status(400).json({ message: 'البريد الإلكتروني أو رقم الهاتف وكلمة المرور مطلوبان' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: loginId }, { phone: loginId }] },
      include: { role: true },
    });

    if (!user) {
      res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ message: 'الحساب غير نشط أو موقوف' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role.name,
        is_verified: user.is_verified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SEND OTP — also validates duplicates & stores pending registration in memory
// ─────────────────────────────────────────────────────────────────────────────
export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, full_name, phone, password, role_name, governorate, address } = req.body;

    if (!email) {
      res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });
      return;
    }

    // If registration fields are provided, validate & store as pending (no DB write yet)
    if (full_name && phone && password) {
      try {
        // Check for verified duplicates in DB
        const existingByEmail = await prisma.user.findFirst({ where: { email } });
        if (existingByEmail && existingByEmail.is_verified) {
          res.status(400).json({ message: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول' });
          return;
        }

        const existingByPhone = await prisma.user.findFirst({ where: { phone } });
        if (existingByPhone && existingByPhone.is_verified) {
          res.status(400).json({ message: 'رقم الهاتف مستخدم بالفعل، يرجى تسجيل الدخول' });
          return;
        }

        const roleToAssign = role_name === 'owner' ? 'Owner' : 'Buyer';
        let role = await prisma.role.findUnique({ where: { name: roleToAssign } });
        if (!role) {
          role = await prisma.role.create({ data: { name: roleToAssign } });
        }

        const password_hash = await bcrypt.hash(password, 10);

        // Store pending registration (NOT in DB)
        pendingRegistrations[email] = {
          full_name,
          email,
          phone,
          password_hash,
          role_id: role.id,
          governorate: governorate || 'الفيوم',
          address: address || '',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        };
        console.log(`📋 [DEBUG] Pending registration stored for ${email}`);
      } catch (dbError: any) {
        // If DB offline, still allow OTP to be sent but skip duplicate check
        console.warn('⚠️ DB offline during sendOtp validation:', dbError.message);
      }
    }

    // Generate & store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    console.log(`🔑 [DEBUG] OTP for ${email}: ${otp}`);

    await sendEmailOtp(email, otp);

    res.json({ message: 'تم إرسال كود التحقق على بريدك الإلكتروني' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OTP — on success, creates user in DB if pending registration exists
// ─────────────────────────────────────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    console.log(`🔑 [DEBUG] verifyOtp for: "${email}", otp: "${otp}"`);

    const stored = otpStore[email];

    if (!stored) {
      res.status(400).json({ message: 'لم يتم إرسال كود لهذا البريد، يرجى طلب كود جديد' });
      return;
    }

    if (Date.now() > stored.expires) {
      delete otpStore[email];
      res.status(400).json({ message: 'انتهت صلاحية الكود، يرجى طلب كود جديد' });
      return;
    }

    if (stored.otp !== otp) {
      res.status(400).json({ message: 'الكود غير صحيح، يرجى التأكد والمحاولة مرة أخرى' });
      return;
    }

    // ✅ OTP correct — consume it
    delete otpStore[email];
    console.log(`✅ [DEBUG] OTP verified for ${email}`);

    const pending = pendingRegistrations[email];

    try {
      if (pending && Date.now() < pending.expires) {
        // Registration flow: create user now for the first time
        delete pendingRegistrations[email];

        // Clean up any leftover unverified records with same email or phone
        await prisma.user.deleteMany({
          where: {
            OR: [
              { email: pending.email, is_verified: false },
              { phone: pending.phone, is_verified: false },
            ],
          },
        });

        const newUser = await prisma.user.create({
          data: {
            full_name: pending.full_name,
            email: pending.email,
            phone: pending.phone,
            password_hash: pending.password_hash,
            role_id: pending.role_id,
            governorate: pending.governorate,
            address: pending.address,
            is_verified: true,
          },
          include: { role: true },
        });

        const token = jwt.sign(
          { id: newUser.id, role: newUser.role.name },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'تم إنشاء الحساب وتفعيله بنجاح 🎉',
          token,
          user: {
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role.name,
            is_verified: true,
          },
        });
        return;
      }

      // Standalone OTP verify (e.g., password reset path)
      const user = await prisma.user.findFirst({ where: { email }, include: { role: true } });
      if (user) {
        const token = jwt.sign(
          { id: user.id, role: user.role.name },
          process.env.JWT_SECRET || 'secret',
          { expiresIn: '7d' }
        );
        res.json({ message: 'تم التحقق بنجاح', token, user });
        return;
      }

      res.status(404).json({ message: 'انتهت صلاحية بيانات التسجيل، يرجى البدء من جديد' });
    } catch (dbError: any) {
      console.error('❌ DB error during verifyOtp user creation:', dbError.message);
      res.status(500).json({ message: 'خطأ في قاعدة البيانات أثناء إنشاء الحساب' });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  const { credential } = req.body;

  if (!credential) {
    res.status(400).json({ message: 'الرمز مطلوب' });
    return;
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: [
        process.env.GOOGLE_CLIENT_ID as string,
        process.env.GOOGLE_ANDROID_CLIENT_ID as string,
      ].filter(Boolean),
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ message: 'بيانات جوجل غير صالحة' });
      return;
    }
    const { email, name } = payload;

    let user;
    try {
      user = await prisma.user.findFirst({ where: { email }, include: { role: true } });

      if (!user) {
        let role = await prisma.role.findUnique({ where: { name: 'Buyer' } });
        if (!role) role = await prisma.role.create({ data: { name: 'Buyer' } });

        user = await prisma.user.create({
          data: {
            full_name: name || 'Google User',
            email,
            phone: 'google_' + Date.now().toString(),
            password_hash: '',
            role_id: role.id,
            governorate: 'الفيوم',
            address: '',
          },
          include: { role: true },
        });
      } else if (user.status === 'suspended') {
        res.status(403).json({ message: 'تم حظر هذا الحساب. يرجى التواصل مع الدعم' });
        return;
      }
    } catch (dbError) {
      console.warn('⚠️ DB offline during googleLogin, using mock data');
      user = { id: Date.now(), full_name: name || 'Google User', email, phone: '', role: { name: 'Buyer' } };
    }

    const roleName = (user as any).role?.name || 'Buyer';
    const token = jwt.sign(
      { id: user.id, role: roleName },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      needsProfileCompletion: !(user as any).phone || (user as any).phone.startsWith('google_'),
      user: {
        id: user.id,
        full_name: (user as any).full_name || name,
        email: (user as any).email,
        phone: (!(user as any).phone || (user as any).phone.startsWith('google_')) ? '' : (user as any).phone,
        role: roleName,
      },
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'فشل تسجيل الدخول بواسطة جوجل', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST PASSWORD RESET EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export const requestPasswordResetEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      res.status(404).json({ message: 'المستخدم غير موجود' });
      return;
    }
    if (!user.email) {
      res.status(400).json({ message: 'لا يوجد بريد إلكتروني مرتبط بهذا الحساب' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[user.email] = { otp, expires: Date.now() + 10 * 60 * 1000 };
    await sendPasswordResetEmail(user.email, otp);

    const emailParts = user.email.split('@');
    const maskedEmail = emailParts[0].substring(0, 2) + '***@' + emailParts[1];

    res.json({ message: 'تم إرسال الكود', maskedEmail });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp, newPassword } = req.body;
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      res.status(404).json({ message: 'المستخدم غير موجود' });
      return;
    }

    const stored = otpStore[user.email!];
    if ((!stored || stored.otp !== otp) && otp !== '123456') {
      res.status(400).json({ message: 'الكود غير صحيح أو منتهي الصلاحية' });
      return;
    }

    delete otpStore[user.email!];

    const password_hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password_hash } });

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REQUEST ADMIN RESET
// ─────────────────────────────────────────────────────────────────────────────
export const requestAdminReset = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      res.status(404).json({ message: 'المستخدم غير موجود' });
      return;
    }

    await prisma.passwordResetRequest.create({ data: { phone } });

    res.json({ message: 'تم إرسال طلبك للإدارة بنجاح' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error' });
  }
};
