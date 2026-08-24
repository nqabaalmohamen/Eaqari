'use client';

import { API_BASE } from '@/utils/api';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveSession } from '@/utils/auth';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ALL_CENTERS_NAMES } from '@/utils/fayoumData';

const fetchWithNgrok = (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    'ngrok-skip-browser-warning': 'true',
  };
  return fetch(url, { ...options, headers });
};

// ====== OTP Verification Screen ======
// registrationData is passed in so resend also carries registration fields
function OTPScreen({
  email,
  registrationData,
  onSuccess,
  onCancel,
}: {
  email: string;
  registrationData: Record<string, string>;
  onSuccess: (token: string, user: any) => void;
  onCancel: () => void;
}) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setTimer(60);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      // Pass all registration data so backend stores it as pending
      await fetchWithNgrok(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...registrationData }),
      });
      if (Capacitor.isNativePlatform()) {
        try {
          const permResult = await LocalNotifications.requestPermissions();
          if (permResult.display === 'granted') {
            await LocalNotifications.schedule({
              notifications: [{
                title: '📧 تم إرسال كود التفعيل',
                body: 'افتح الجيميل ← اضغط النقاط الثلاث ⋮ ← اختار "الرسائل غير المرغوب فيها" ← ستجد الكود',
                id: Math.floor(Math.random() * 100000),
                schedule: { at: new Date(Date.now() + 1500) },
                sound: 'default',
                actionTypeId: '',
                extra: null,
              }]
            });
          }
        } catch (notifErr) { console.error('Notification error:', notifErr); }
      }
    } finally {
      setSendingOtp(false);
    }
    startTimer();
  };

  useEffect(() => {
    sendOtp();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('يرجى إدخال الكود كاملاً (6 أرقام)'); return; }
    setVerifying(true); setError('');
    try {
      const res = await fetchWithNgrok(`${API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        // Backend created user in DB and returned token+user
        onSuccess(data.token, data.user);
      } else {
        // Show clean Arabic error from backend (now always correct)
        setError(data.message || 'الكود غير صحيح، يرجى التأكد والمحاولة مرة أخرى');
      }
    } catch { setError('حدث خطأ في الاتصال، حاول مجدداً'); }
    finally { setVerifying(false); }
  };

  return (
    <main className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      <div className="bg-white py-4 px-6 shadow-sm border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="عقاري" className="w-9 h-9 object-contain" />
          <h1 className="text-lg font-black text-gray-900">تأكيد الحساب</h1>
        </div>
        <button onClick={onCancel} className="text-xs font-bold text-gray-500 hover:text-gray-900">
          رجوع
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        <div className="w-16 h-16 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mb-4 border-2 border-[#c9a84c]/30">
          <svg className="w-8 h-8 text-[#c9a84c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-lg font-black text-gray-900 mb-1 text-center">أدخل كود التفعيل</h2>
        <p className="text-xs text-gray-500 mb-1 text-center">تم إرسال الكود إلى:</p>
        <p className="text-sm font-black text-[#c9a84c] mb-4 text-center" dir="ltr">{email}</p>

        <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-right">
          <p className="text-xs font-black text-amber-800 mb-2 flex items-center gap-1.5">
            <span className="text-base">📧</span> كيف تجد الكود؟
          </p>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 bg-[#c9a84c] text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">١</span>
              <p className="text-[11px] text-amber-900 font-bold">افتح تطبيق الجيميل Gmail</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 bg-[#c9a84c] text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">٢</span>
              <p className="text-[11px] text-amber-900 font-bold">اضغط على النقاط الثلاث <strong>⋮</strong> في أعلى يمين الشاشة</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 bg-[#c9a84c] text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">٣</span>
              <p className="text-[11px] text-amber-900 font-bold">اختر <strong>"الرسائل غير المرغوب فيها" (Spam)</strong></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 bg-[#c9a84c] text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 mt-0.5">٤</span>
              <p className="text-[11px] text-amber-900 font-bold">ستجد رسالة من عقاري تحتوي على الكود 🎉</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl font-bold text-center mb-3 flex items-center justify-center gap-1">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        {/* OTP Input */}
        <div className="flex justify-center gap-1.5 mb-4 w-full" dir="ltr">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              style={{ width: '15%', minWidth: '35px', maxWidth: '45px' }}
              className="h-12 text-center text-xl font-black rounded-xl border-2 border-gray-200 focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/20 focus:outline-none bg-gray-50 focus:bg-white transition-all shadow-sm shrink-0"
            />
          ))}
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="w-full max-w-[280px] py-3 bg-gradient-to-r from-[#c9a84c] to-[#b3933e] text-white font-black text-base rounded-xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-[#c9a84c]/40 mb-3"
        >
          {verifying ? 'جاري التحقق...' : 'تفعيل الحساب ✓'}
        </button>

        <div className="text-center">
          {canResend ? (
            <button onClick={sendOtp} disabled={sendingOtp} className="text-xs font-black text-[#c9a84c] hover:underline">
              {sendingOtp ? 'جاري الإرسال...' : 'إعادة إرسال الكود'}
            </button>
          ) : (
            <p className="text-xs text-gray-500">إعادة الإرسال بعد <span className="font-black text-gray-800">{timer}</span> ثانية</p>
          )}
        </div>
      </div>
    </main>
  );
}

// ====== Main Registration Form ======
export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [interests, setInterests] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtpScreen, setShowOtpScreen] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      try {
        GoogleAuth.initialize({
          clientId: '812155132439-u9bo09n8ltmsvkcjmufcta5hnj1g93up.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
      } catch (e) { console.error('GoogleAuth init error', e); }
    }
  }, []);

  const handleNativeGoogleLogin = async () => {
    try {
      setLoading(true);
      const googleUser = await GoogleAuth.signIn();
      const res = await fetchWithNgrok(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: googleUser.authentication.idToken }),
      });
      const data = await res.json();
      if (res.ok) {
        saveSession(data.token, data.user);
        window.dispatchEvent(new Event('auth-changed'));
        router.push('/');
      } else { setError(data.message || 'فشل التسجيل بواسطة جوجل'); }
    } catch { setError('حدث خطأ أثناء الاتصال بالخادم'); }
    finally { setLoading(false); }
  };

  const validatePassword = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 11) { setError('رقم الهاتف يجب أن يكون 11 رقماً'); return; }
    if (!validatePassword(password)) {
      setError('كلمة المرور يجب أن تحتوي على: 8 أحرف + حرف كبير + حرف صغير + رقم');
      return;
    }
    if (password !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }

    setError('');
    setLoading(true);
    try {
      // Send all registration data to backend with OTP request
      // Backend validates duplicates & stores pending registration in memory
      const res = await fetchWithNgrok(`${API_BASE}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          phone,
          password,
          role_name: 'buyer',
          governorate: address || 'الفيوم',
          address: interests || '',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowOtpScreen(true);
      } else {
        setError(data.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
      }
    } catch { setError('لا يمكن الاتصال بالخادم، تحقق من الإنترنت'); }
    finally { setLoading(false); }
  };

  // Called by OTPScreen after successful OTP verification + user creation
  const handleOtpSuccess = (token: string, user: any) => {
    saveSession(token, user);
    window.dispatchEvent(new Event('auth-changed'));
    router.push('/complete-profile');
  };

  if (showOtpScreen) {
    return (
      <OTPScreen
        email={email}
        registrationData={{
          full_name: fullName,
          phone,
          password,
          role_name: 'buyer',
          governorate: address || 'الفيوم',
          address: interests || '',
        }}
        onSuccess={handleOtpSuccess}
        onCancel={() => setShowOtpScreen(false)}
      />
    );
  }

  const inputCls = "w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c]/10 focus:outline-none text-sm bg-white shadow-sm transition-all";
  const labelCls = "block text-[10px] font-black text-gray-700 mb-0.5";

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return (
    <main className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white py-2 px-4 shadow-sm border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="عقاري" className="w-8 h-8 object-contain" />
          <h1 className="text-sm font-black text-gray-900 leading-none">حساب جديد</h1>
        </div>
        <Link href="/login" className="text-[10px] font-black text-[#c9a84c] border border-[#c9a84c]/40 px-3 py-1.5 rounded-xl hover:bg-[#c9a84c]/10 transition-all flex items-center gap-1">
          <span>عودة الي تسجيل الدخول</span>
        </Link>
      </div>

      {/* COMPACT FORM — NO SCROLLING */}
      <div className="flex-1 flex flex-col px-4 py-2 justify-center">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] px-2 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1 mb-2 shrink-0">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 max-w-sm w-full mx-auto">

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>الاسم بالكامل *</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="أحمد محمد" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>الهاتف *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} required maxLength={11} dir="ltr" placeholder="01xxxxxxxxx" className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>البريد الإلكتروني *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr" placeholder="example@gmail.com" className={inputCls} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>المدينة *</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} required placeholder="الفيوم" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className={labelCls}>المركز</label>
              <select value={interests} onChange={e => setInterests(e.target.value)} className={inputCls}>
                <option value="">إختر...</option>
                {ALL_CENTERS_NAMES.map(center => <option key={center} value={center}>{center}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelCls}>كلمة المرور *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required dir="ltr" placeholder="••••••••"
                  className={`${inputCls} pr-8 ${password ? (hasLength && hasUpper && hasLower && hasNumber ? 'border-green-400' : 'border-amber-400') : ''}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className={labelCls}>تأكيد المرور *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required dir="ltr" placeholder="••••••••"
                  className={`${inputCls} pr-8 ${confirmPassword ? (password === confirmPassword ? 'border-green-400' : 'border-red-400') : ''}`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center mt-[-4px]">
            <span className={`text-[9px] font-bold ${password ? (hasLength ? 'text-green-600' : 'text-amber-500') : 'text-gray-400'}`}>{hasLength ? '✓' : '•'} 8 أحرف</span>
            <span className={`text-[9px] font-bold ${password ? (hasUpper ? 'text-green-600' : 'text-amber-500') : 'text-gray-400'}`}>{hasUpper ? '✓' : '•'} حرف كبير</span>
            <span className={`text-[9px] font-bold ${password ? (hasLower ? 'text-green-600' : 'text-amber-500') : 'text-gray-400'}`}>{hasLower ? '✓' : '•'} حرف صغير</span>
            <span className={`text-[9px] font-bold ${password ? (hasNumber ? 'text-green-600' : 'text-amber-500') : 'text-gray-400'}`}>{hasNumber ? '✓' : '•'} رقم</span>
          </div>

          <button type="submit" disabled={loading} className="w-full py-2.5 mt-1 bg-gradient-to-r from-[#c9a84c] to-[#b3933e] text-white font-black text-sm rounded-xl hover:opacity-90 shadow-md active:scale-95">
            {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>

          <div className="flex items-center my-0.5">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="mx-2 text-gray-400 text-[10px] font-bold">أو</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {Capacitor.isNativePlatform() ? (
            <button type="button" onClick={handleNativeGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-2 py-2 border-2 border-gray-200 rounded-xl bg-white hover:bg-gray-50 active:scale-95 shadow-sm">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
              <span className="text-gray-700 font-bold text-xs">جوجل</span>
            </button>
          ) : (
            <div className="flex justify-center w-full">
              <GoogleLogin
                onSuccess={async (credentialResponse) => {
                  setLoading(true);
                  try {
                    const res = await fetchWithNgrok(`${API_BASE}/api/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: credentialResponse.credential }) });
                    const data = await res.json();
                    if (res.ok) { saveSession(data.token, data.user); window.dispatchEvent(new Event('auth-changed')); router.push('/'); }
                    else { setError(data.message || 'فشل التسجيل'); }
                  } catch { setError('حدث خطأ'); }
                  finally { setLoading(false); }
                }}
                onError={() => setError('فشل التسجيل')}
                text="continue_with" theme="outline" size="medium" width="100%"
              />
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
