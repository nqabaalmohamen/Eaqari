'use client';



import { useState, useEffect, useRef } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { saveSession } from '@/utils/auth';

import { GoogleLogin } from '@react-oauth/google';

import { Capacitor } from '@capacitor/core';

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';



// ====== OTP Verification Screen ======

function OTPScreen({ email, userData, onSuccess }: {

  email: string;

  userData: any;

  onSuccess: () => void;

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

      await fetch('https://eaqari.vercel.app/api/auth/send-otp', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email }),

      });

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

    setError('');

    if (value && index < 5) {

      inputRefs.current[index + 1]?.focus();

    }

  };



  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {

    if (e.key === 'Backspace' && !otp[index] && index > 0) {

      inputRefs.current[index - 1]?.focus();

    }

  };



  const handleVerify = async () => {

    const code = otp.join('');

    if (code.length !== 6) {

      setError('يرجى إدخال الكود المكون من 6 أرقام');

      return;

    }

    setVerifying(true);

    try {

      const res = await fetch('https://eaqari.vercel.app/api/auth/verify-otp', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email, otp: code }),

      });

      if (res.ok) {

        const data = await res.json();

        const finalUser = data.user?.full_name === 'مستخدم' || !data.user?.full_name

          ? userData

          : data.user;

        saveSession(data.token, finalUser);

        const localUsers = JSON.parse(localStorage.getItem('eaqari_local_users') || '[]');

        const exists = localUsers.find((u: any) => u.email === finalUser.email);

        if (!exists) {

          localUsers.push(finalUser);

          localStorage.setItem('eaqari_local_users', JSON.stringify(localUsers));

        }

        onSuccess();

        return;

      } else {

        const errData = await res.json();

        setError(errData.message || 'الكود غير صحيح');

      }

    } catch (e) {

      // Demo fallback

      if (code === '123456') {

        saveSession('dummy_jwt_token', userData);

        const localUsers = JSON.parse(localStorage.getItem('eaqari_local_users') || '[]');

        const exists = localUsers.find((u: any) => u.email === userData.email);

        if (!exists) {

          localUsers.push(userData);

          localStorage.setItem('eaqari_local_users', JSON.stringify(localUsers));

        }

        onSuccess();

        return;

      }

      setError('تعذر التحقق. تأكد من الكود.');

    }

    setVerifying(false);

  };



  const handleResend = () => {

    setOtp(['', '', '', '', '', '']);

    setError('');

    sendOtp();

    inputRefs.current[0]?.focus();

  };



  return (

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">

      <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 space-y-6 text-center">

        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">

          <span className="text-3xl">📧</span>

        </div>

        <div className="space-y-1">

          <h2 className="text-xl font-black text-gray-900">تأكيد البريد الإلكتروني</h2>

          <p className="text-sm text-gray-500">تم إرسال كود التحقق إلى</p>

          <p className="text-blue-600 font-bold text-sm" dir="ltr">{email}</p>

        </div>



        <div className="flex justify-center gap-2" dir="ltr">

          {otp.map((digit, i) => (

            <input

              key={i}

              ref={el => { inputRefs.current[i] = el; }}

              type="text"

              inputMode="numeric"

              maxLength={1}

              value={digit}

              onChange={e => handleOtpChange(i, e.target.value)}

              onKeyDown={e => handleKeyDown(i, e)}

              className={`w-11 h-12 text-center text-xl font-black border-2 rounded-xl focus:outline-none transition-all ${

                digit

                  ? 'border-blue-500 bg-blue-50 text-blue-700'

                  : 'border-gray-200 bg-gray-50 text-gray-900'

              } focus:border-blue-500 focus:bg-blue-50`}

            />

          ))}

        </div>



        {error && (

          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl font-medium">

            {error}

          </div>

        )}



        <div className="text-sm">

          {!canResend ? (

            <p className="text-gray-400">

              انتهاء صلاحية الكود بعد{' '}

              <span className="font-black text-blue-600">{timer}</span> ثانية

            </p>

          ) : (

            <button

              onClick={handleResend}

              disabled={sendingOtp}

              className="text-blue-600 font-bold hover:underline disabled:opacity-50"

            >

              {sendingOtp ? 'جاري الإرسال...' : '🔄 إعادة إرسال الكود'}

            </button>

          )}

        </div>



        <button

          onClick={handleVerify}

          disabled={verifying || otp.join('').length < 6}

          className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"

        >

          {verifying ? 'جاري التحقق...' : 'تأكيد وإنشاء الحساب ✓'}

        </button>



        <Link href="/register" className="block text-xs text-gray-400 hover:text-gray-600">

          ← تعديل البيانات

        </Link>

      </div>

    </div>

  );

}



// ====== Main Register Form ======

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



  const [showOTP, setShowOTP] = useState(false);

  const [userData, setUserData] = useState<any>(null);



  useEffect(() => {

    if (Capacitor.isNativePlatform()) {

      GoogleAuth.initialize();

    }

  }, []);



  const handleNativeGoogleLogin = async () => {

    setLoading(true);

    let googleUser;

    try {

      googleUser = await GoogleAuth.signIn();

    } catch (err: any) {

      setError(`فشل تسجيل الدخول من جوجل: ${err.message || 'تأكد من إعدادات Client ID'}`);

      setLoading(false);

      return;

    }



    try {

      const res = await fetch('https://eaqari.vercel.app/api/auth/google', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ credential: googleUser.authentication.idToken }),

      });

      const data = await res.json();

      if (res.ok) {

        saveSession(data.token, data.user);
        window.dispatchEvent(new Event('auth-changed'));

        router.push('/dashboard');

      } else {

        setError(data.message || 'فشل التسجيل بواسطة جوجل');

      }

    } catch (err) {

      setError('حدث خطأ أثناء الاتصال بالخادم');

    } finally {

      setLoading(false);

    }

  };



  const validateForm = () => {

    if (!fullName.trim()) return 'يرجى إدخال الاسم الكامل';

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'يرجى إدخال بريد إلكتروني صحيح';

    if (phone.length < 11 || !/^01\d{9}$/.test(phone)) return 'رقم الهاتف يجب أن يكون 11 رقماً ويبدأ بـ 01';

    if (!address.trim()) return 'يرجى إدخال عنوانك';

    if (password.length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';

    if (password !== confirmPassword) return 'كلمة المرور وتأكيدها غير متطابقتين';

    return null;

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    const validationError = validateForm();

    if (validationError) { setError(validationError); return; }

    setError('');

    setLoading(true);



    const payload = {

      full_name: fullName,

      email,

      phone,

      password,

      address,

      interests,

      role_name: 'User',

      governorate: 'الفيوم',

    };



    try {

      const response = await fetch('https://eaqari.vercel.app/api/auth/register', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify(payload),

      });

      const data = await response.json();

      if (response.ok) {

        const builtUser = {

          id: data.user?.id || Date.now(),

          full_name: fullName,

          email,

          phone,

          role: 'User' as any,

          address,

          governorate: 'الفيوم',

        };

        setUserData(builtUser);

        setShowOTP(true);

        return;

      }

      setError(data.message || 'حدث خطأ. حاول مرة أخرى.');

    } catch (err) {

      // Offline fallback

      const dummyUser = {

        id: Date.now(),

        full_name: fullName,

        email,

        phone,

        role: 'User' as any,

        address,

        governorate: 'الفيوم',

      };

      setUserData(dummyUser);

      setShowOTP(true);

    } finally {

      setLoading(false);

    }

  };



  const handleOTPSuccess = () => {

    router.push('/dashboard');

  };



  if (showOTP && userData) {

    return <OTPScreen email={email} userData={userData} onSuccess={handleOTPSuccess} />;

  }



  return (

    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">

      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">

        {/* Header */}

        <div className="text-center">

          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">

            <span className="text-2xl">🏠</span>

          </div>

          <h1 className="text-2xl font-black text-gray-900">إنشاء حساب جديد</h1>

          <p className="text-sm text-gray-500 mt-1">انضم إلى منصة عقاري الفيوم</p>

        </div>



        {error && (

          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium">

            {error}

          </div>

        )}



        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Full Name */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل *</label>

            <input

              type="text"

              value={fullName}

              onChange={e => setFullName(e.target.value)}

              placeholder="محمد أحمد علي"

              required

              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

            />

          </div>



          {/* Email */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني *</label>

            <input

              type="email"

              value={email}

              onChange={e => setEmail(e.target.value)}

              placeholder="example@gmail.com"

              required

              dir="ltr"

              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

            />

            <p className="text-xs text-gray-400 mt-1">سيُرسَل كود التحقق إلى هذا البريد</p>

          </div>



          {/* Phone */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">رقم الهاتف *</label>

            <input

              type="tel"

              value={phone}

              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}

              placeholder="01xxxxxxxxx"

              maxLength={11}

              required

              dir="ltr"

              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

            />

          </div>



          {/* Address */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">العنوان *</label>

            <input

              type="text"

              value={address}

              onChange={e => setAddress(e.target.value)}

              placeholder="مثال: الفيوم - مدينة الفيوم - شارع النيل"

              required

              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

            />

          </div>



          {/* Interests (optional) */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">الاهتمامات <span className="text-gray-400 font-normal">(اختياري)</span></label>

            <input

              type="text"

              value={interests}

              onChange={e => setInterests(e.target.value)}

              placeholder="مثال: شقق للإيجار، فيلات للبيع"

              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

            />

          </div>



          {/* Password */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور *</label>

            <div className="relative">

              <input

                type={showPassword ? 'text' : 'password'}

                value={password}

                onChange={e => setPassword(e.target.value)}

                placeholder="6 أحرف على الأقل"

                required

                className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

              />

              <button

                type="button"

                onClick={() => setShowPassword(!showPassword)}

                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"

              >

                {showPassword ? '🙈' : '👁️'}

              </button>

            </div>

          </div>



          {/* Confirm Password */}

          <div>

            <label className="block text-sm font-bold text-gray-700 mb-1">تأكيد كلمة المرور *</label>

            <div className="relative">

              <input

                type={showConfirmPassword ? 'text' : 'password'}

                value={confirmPassword}

                onChange={e => setConfirmPassword(e.target.value)}

                placeholder="أعد كتابة كلمة المرور"

                required

                className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

              />

              <button

                type="button"

                onClick={() => setShowConfirmPassword(!showConfirmPassword)}

                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"

              >

                {showConfirmPassword ? '🙈' : '👁️'}

              </button>

            </div>

          </div>



          <button

            type="submit"

            disabled={loading}

            className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"

          >

            {loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب →'}

          </button>

        </form>



        <div className="relative flex items-center py-2">

          <div className="flex-grow border-t border-gray-200"></div>

          <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">أو</span>

          <div className="flex-grow border-t border-gray-200"></div>

        </div>



        <div className="flex justify-center w-full">

          {Capacitor.isNativePlatform() ? (

            <button

              type="button"

              onClick={handleNativeGoogleLogin}

              disabled={loading}

              className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"

            >

              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />

              <span className="text-gray-700 font-bold text-sm">التسجيل باستخدام جوجل</span>

            </button>

          ) : (

            <GoogleLogin

              onSuccess={async (credentialResponse) => {

                setLoading(true);

                try {

                  const res = await fetch('https://eaqari.vercel.app/api/auth/google', {

                    method: 'POST',

                    headers: { 'Content-Type': 'application/json' },

                    body: JSON.stringify({ credential: credentialResponse.credential }),

                  });

                  const data = await res.json();

                  if (res.ok) {

                    saveSession(data.token, data.user);

                    router.push('/dashboard');

                  } else {

                    setError(data.message || 'فشل التسجيل بواسطة جوجل');

                  }

                } catch (err) {

                  setError('حدث خطأ أثناء الاتصال بالخادم');

                } finally {

                  setLoading(false);

                }

              }}

              onError={() => {

                setError('فشل التسجيل بواسطة جوجل');

              }}

              text="continue_with"

              theme="outline"

              size="large"

              shape="rectangular"

              width="100%"

            />

          )}

        </div>



        <p className="text-center text-sm text-gray-500">

          لديك حساب؟{' '}

          <Link href="/login" className="text-blue-600 font-bold hover:underline">

            سجل دخولك

          </Link>

        </p>

      </div>

    </main>

  );

}

