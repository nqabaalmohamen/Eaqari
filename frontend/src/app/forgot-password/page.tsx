'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { API_BASE } from '@/utils/api';

const fetchWithNgrok = (url: any, options: any = {}) => {
  const headers = options.headers || {};
  headers['ngrok-skip-browser-warning'] = 'true';
  return fetch(url, { ...options, headers });
};

export default function ForgotPassword() {
  const router = useRouter();

  // 'selection' | 'email_phone_input' | 'otp_verify' | 'new_password' | 'admin_request' | 'success'
  const [step, setStep] = useState<'selection' | 'email_phone_input' | 'otp_verify' | 'new_password' | 'admin_request' | 'success'>('selection');
  
  const [phone, setPhone] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const selectEmailReset = () => {
    setStep('email_phone_input');
    setError('');
  };

  const selectAdminRequest = () => {
    setStep('admin_request');
    setError('');
  };

  const handleRequestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 11) {
      setError('رقم الهاتف يجب أن يكون 11 رقماً');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithNgrok(`${API_BASE}/api/auth/forgot-password/request-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setMaskedEmail(data.maskedEmail);
        setStep('otp_verify');

        if (Capacitor.isNativePlatform()) {
          try {
            await LocalNotifications.requestPermissions();
            await LocalNotifications.schedule({
              notifications: [{
                title: 'تم إرسال الكود',
                body: 'يرجى التحقق من بريدك الوارد (أو مجلد Spam).',
                id: Date.now(),
                schedule: { at: new Date(Date.now() + 1000) }
              }]
            });
          } catch (e) {
            console.log('Notification error', e);
          }
        }
      } else {
        setError(data.message || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch (err) {
      setError('لا يمكن الاتصال بالخادم الآن. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };
  
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOtpAndProceed = () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('يرجى إدخال الكود كاملاً');
      return;
    }
    setError('');
    setStep('new_password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetchWithNgrok(`${API_BASE}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otp.join(''), newPassword }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStep('success');
      } else {
        setError(data.message || 'فشلت عملية تغيير كلمة المرور');
      }
    } catch (err) {
      setError('حدث خطأ أثناء تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 11) {
      setError('رقم الهاتف يجب أن يكون 11 رقماً');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithNgrok(`${API_BASE}/api/auth/forgot-password/admin-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStep('success');
      } else {
        setError(data.message || 'حدث خطأ أثناء إرسال الطلب');
      }
    } catch (err) {
      setError('حدث خطأ أثناء إرسال الطلب للإدارة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-2xl">
            🔒
          </div>
          <h1 className="text-xl font-black text-gray-900">استعادة كلمة المرور</h1>
          <p className="text-gray-500 text-sm mt-2">لا تقلق، سنساعدك في استعادة حسابك</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-xs px-4 py-3 rounded-xl mb-4 font-bold border border-red-200 text-center">
            {error}
          </div>
        )}

        {/* STEP: SELECTION */}
        {step === 'selection' && (
          <div className="space-y-3">
            <button
              onClick={selectEmailReset}
              className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">✉️</span>
                <div className="text-right">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-700 text-sm">استعادة عبر البريد الإلكتروني</h3>
                  <p className="text-xs text-gray-500">سيتم إرسال كود تحقق إلى بريدك</p>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </button>

            <button
              onClick={selectAdminRequest}
              className="w-full flex items-center justify-between p-4 border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">👨‍💻</span>
                <div className="text-right">
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-700 text-sm">طلب كلمة سر من الإدارة</h3>
                  <p className="text-xs text-gray-500">سيتم التواصل معك عبر الواتساب</p>
                </div>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <div className="pt-4 text-center">
              <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-gray-900">
                العودة لتسجيل الدخول
              </Link>
            </div>
          </div>
        )}

        {/* STEP: EMAIL PHONE INPUT */}
        {step === 'email_phone_input' && (
          <form onSubmit={handleRequestEmailOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف المسجل في الحساب</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={11}
                dir="ltr"
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال كود التحقق'}
            </button>
            <button type="button" onClick={() => setStep('selection')} className="w-full text-sm text-gray-500 hover:text-gray-800 font-bold">
              العودة للخلف
            </button>
          </form>
        )}

        {/* STEP: OTP VERIFY */}
        {step === 'otp_verify' && (
          <div className="space-y-5">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <span className="text-green-600 text-2xl mb-1 block">📩</span>
              <p className="text-xs text-green-700 font-medium">تم إرسال كود التحقق إلى البريد الإلكتروني الخاص بك:</p>
              <p className="text-sm font-black text-green-800 mt-1" dir="ltr">{maskedEmail}</p>
            </div>
            
            <div className="flex justify-between gap-2" dir="ltr">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => { inputRefs.current[index] = el; }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className="w-full h-12 text-center text-xl font-black rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-gray-50"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={verifyOtpAndProceed}
              className="w-full py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors"
            >
              تحقق من الكود
            </button>
            <button type="button" onClick={() => setStep('email_phone_input')} className="w-full text-sm text-gray-500 hover:text-gray-800 font-bold">
              تغيير رقم الهاتف
            </button>
          </div>
        )}

        {/* STEP: NEW PASSWORD */}
        {step === 'new_password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </button>
          </form>
        )}

        {/* STEP: ADMIN REQUEST */}
        {step === 'admin_request' && (
          <form onSubmit={handleAdminRequest} className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-2">
              <p className="text-xs text-yellow-800 font-medium text-center">
                سيقوم فريق الدعم بمراجعة طلبك وإرسال كلمة المرور الجديدة عبر الواتساب للرقم المسجل به الحساب.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">رقم الهاتف المسجل</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={11}
                dir="ltr"
                placeholder="01xxxxxxxxx"
                className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'جاري الإرسال...' : 'إرسال الطلب للإدارة'}
            </button>
            <button type="button" onClick={() => setStep('selection')} className="w-full text-sm text-gray-500 hover:text-gray-800 font-bold">
              العودة للخلف
            </button>
          </form>
        )}

        {/* STEP: SUCCESS */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center text-green-600 text-3xl">
              ✓
            </div>
            <h2 className="text-lg font-black text-gray-900">تمت العملية بنجاح!</h2>
            <p className="text-sm text-gray-500">
              يمكنك الآن تسجيل الدخول باستخدام حسابك.
            </p>
            <Link
              href="/login"
              className="block w-full py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors"
            >
              الذهاب لتسجيل الدخول
            </Link>
          </div>
        )}

      </div>
    </main>
  );
}
