import nodemailer from 'nodemailer';

let testTransporter: any = null;
let testAccountInfo: any = null;

// Create Ethereal test account automatically if no real credentials provided
async function getTransporter() {
  const hasRealCreds =
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_USER !== 'your_gmail@gmail.com';

  if (hasRealCreds) {
    // Use real Gmail credentials
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }),
      isTest: false,
    };
  }

  // Auto-create Ethereal test account (free, no setup needed)
  if (!testTransporter) {
    console.log('📧 Creating free Ethereal test email account...');
    const testAccount = await nodemailer.createTestAccount();
    testAccountInfo = testAccount;
    testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`✅ Ethereal test account created: ${testAccount.user}`);
  }

  return { transporter: testTransporter, isTest: true };
}

export const sendEmailOtp = async (email: string, otp: string): Promise<boolean> => {
  console.log(`\n📧 Attempting to send OTP email to: ${email}`);

  try {
    const { transporter, isTest } = await getTransporter();

    const mailOptions = {
      from: `"عقاري 🏠" <noreply@eaqari.com>`,
      to: email,
      subject: 'كود التحقق - عقاري',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f8fafc; border-radius: 12px;">
          <div style="background: linear-gradient(135deg, #1a56db, #0e40a0); padding: 24px; border-radius: 10px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏠 عقاري</h1>
            <p style="color: #bfdbfe; margin: 8px 0 0;">منصة العقارات الرائدة في الفيوم</p>
          </div>
          <div style="background: white; padding: 24px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin-top: 0;">كود التحقق الخاص بك</h2>
            <p style="color: #64748b; margin-bottom: 24px;">استخدم هذا الكود لتأكيد حسابك على منصة عقاري:</p>
            <div style="background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #1d4ed8;">${otp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">
              ⏱️ صالح لمدة 10 دقائق فقط<br/>
              🔒 لا تشارك هذا الكود مع أحد
            </p>
          </div>
          <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">
            إذا لم تقم بطلب هذا الكود، يمكنك تجاهل هذا البريد.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Successfully sent OTP email to ${email}`);

    if (isTest) {
      // Print preview URL for Ethereal test emails
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║         📧 EMAIL PREVIEW LINK              ║');
      console.log('╠════════════════════════════════════════════╣');
      console.log(`║  OTP: ${otp}                              `);
      console.log(`║  Open this link to see the email:          `);
      console.log(`║  ${previewUrl}`);
      console.log('╚════════════════════════════════════════════╝\n');
    }

    return true;
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error?.message || error);
    // Log OTP to console as final fallback
    console.log(`\n🔑 FALLBACK — OTP for ${email}: ${otp}\n`);
    return false;
  }
};
