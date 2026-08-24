import nodemailer from 'nodemailer';

// ===================================================================
// EMAIL PROVIDER SWITCH
// Set BREVO_SMTP_KEY in .env to use Brevo (recommended - goes to Inbox)
// Otherwise falls back to Gmail SMTP
// ===================================================================

const createTransporter = () => {
  // ✅ Brevo SMTP - Best deliverability, goes to Inbox
  if (process.env.BREVO_SMTP_KEY) {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER, // Your Gmail used as sender
        pass: process.env.BREVO_SMTP_KEY, // Brevo SMTP key (NOT Gmail password)
      },
    });
  }

  // ⚠️ Gmail SMTP fallback - May go to Spam for other users
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

// ===== OTP EMAIL =====
export const sendEmailOtp = async (email: string, otp: string): Promise<boolean> => {
  console.log(`\n📧 Attempting to send OTP email to: ${email}`);
  console.log(`📡 Provider: ${process.env.BREVO_SMTP_KEY ? 'Brevo (Inbox)' : 'Gmail SMTP (may go to Spam)'}`);

  const transporter = createTransporter();

  const mailOptions = {
    from: {
      name: 'عقاري Eaqari',
      address: process.env.EMAIL_USER as string,
    },
    to: email,
    replyTo: process.env.EMAIL_USER,
    subject: `كود التحقق الخاص بك: ${otp}`,
    text: [
      'مرحباً،',
      '',
      'شكراً لتسجيلك في تطبيق عقاري Eaqari.',
      '',
      `كود التحقق الخاص بك هو: ${otp}`,
      '',
      'هذا الكود صالح لمدة 10 دقائق فقط.',
      'إذا لم تطلب هذا الكود، يمكنك تجاهل هذه الرسالة بأمان.',
      '',
      '— فريق عقاري',
    ].join('\n'),
    html: `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>كود التحقق - عقاري</title>
</head>
<body style="margin:0;padding:20px;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde3ec;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="background:#1a56db;padding:24px;text-align:center;">
              <p style="color:#ffffff;margin:0;font-size:28px;font-weight:900;font-family:Arial;">🏠 عقاري</p>
              <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px;">منصة العقارات في الفيوم</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;text-align:center;">
              <p style="color:#334155;font-size:16px;font-weight:bold;margin:0 0 6px;">مرحباً!</p>
              <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
                لإتمام التسجيل في تطبيق <strong>عقاري Eaqari</strong>،<br>
                استخدم كود التحقق التالي:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background:#eff6ff;border:2px dashed #3b82f6;border-radius:12px;padding:20px;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#3b82f6;font-weight:bold;margin-bottom:8px;">كود التحقق</p>
                    <p style="margin:0;font-size:46px;font-weight:900;letter-spacing:12px;color:#1d4ed8;font-family:Courier,monospace;">${otp}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#ef4444;font-size:13px;margin:16px 0 0;">⏰ صالح لمدة <strong>10 دقائق</strong> فقط</p>
              <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">🔒 لا تشارك هذا الكود مع أي شخص</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">إذا لم تطلب هذا الكود، تجاهل هذه الرسالة.</p>
              <p style="margin:6px 0 0;color:#cbd5e1;font-size:11px;">© 2025 عقاري Eaqari</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error?.message || error);
    console.log(`\n🔑 FALLBACK — OTP for ${email}: ${otp}\n`);
    return false;
  }
};

// ===== PASSWORD RESET EMAIL =====
export const sendPasswordResetEmail = async (email: string, otp: string): Promise<boolean> => {
  console.log(`\n📧 Attempting to send password reset email to: ${email}`);
  console.log(`📡 Provider: ${process.env.BREVO_SMTP_KEY ? 'Brevo (Inbox)' : 'Gmail SMTP (may go to Spam)'}`);

  const transporter = createTransporter();

  const mailOptions = {
    from: {
      name: 'عقاري Eaqari',
      address: process.env.EMAIL_USER as string,
    },
    to: email,
    replyTo: process.env.EMAIL_USER,
    subject: `إعادة تعيين كلمة المرور: ${otp}`,
    text: [
      'مرحباً،',
      '',
      'تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في تطبيق عقاري Eaqari.',
      '',
      `كود إعادة التعيين: ${otp}`,
      '',
      'هذا الكود صالح لمدة 10 دقائق فقط.',
      'إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة فوراً.',
      '',
      '— فريق عقاري',
    ].join('\n'),
    html: `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعادة تعيين كلمة المرور - عقاري</title>
</head>
<body style="margin:0;padding:20px;background:#f0f4f8;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:520px;margin:0 auto;">
    <tr>
      <td style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde3ec;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="background:#dc2626;padding:24px;text-align:center;">
              <p style="color:#ffffff;margin:0;font-size:26px;font-weight:900;">🔐 إعادة تعيين كلمة المرور</p>
              <p style="color:#fecaca;margin:4px 0 0;font-size:13px;">تطبيق عقاري Eaqari</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;text-align:center;">
              <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
                تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك<br>
                في تطبيق <strong>عقاري Eaqari</strong>.<br>
                استخدم الكود التالي:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background:#fef2f2;border:2px dashed #dc2626;border-radius:12px;padding:20px;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#dc2626;font-weight:bold;margin-bottom:8px;">كود إعادة التعيين</p>
                    <p style="margin:0;font-size:46px;font-weight:900;letter-spacing:12px;color:#b91c1c;font-family:Courier,monospace;">${otp}</p>
                  </td>
                </tr>
              </table>
              <p style="color:#ef4444;font-size:13px;margin:16px 0 0;">⏰ صالح لمدة <strong>10 دقائق</strong> فقط</p>
              <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">🔒 إذا لم تطلب هذا، تجاهل الرسالة فوراً</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">© 2025 عقاري Eaqari - جميع الحقوق محفوظة</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}. MessageId: ${info.messageId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send password reset email:`, error?.message || error);
    return false;
  }
};
