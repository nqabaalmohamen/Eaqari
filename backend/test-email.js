const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env' });

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***set***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { rejectUnauthorized: false }
});

transporter.verify(function(err, success) {
  if (err) {
    console.log('SMTP Connection FAILED:', err.message);
  } else {
    console.log('SMTP Connection OK - sending test email...');
    
    transporter.sendMail({
      from: { name: 'عقاري Eaqari', address: process.env.EMAIL_USER },
      to: process.env.EMAIL_USER,
      subject: 'اختبار - كود التحقق: 123456',
      text: 'كود التحقق من تطبيق عقاري: 123456',
      html: '<div dir="rtl"><h2>عقاري Eaqari</h2><p>كود التحقق:</p><h1 style="color:blue;letter-spacing:10px;">123456</h1></div>'
    }, function(err, info) {
      if (err) {
        console.log('Send FAILED:', err.message);
      } else {
        console.log('Email SENT! MessageId:', info.messageId);
      }
    });
  }
});
