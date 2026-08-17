'use client';



import { useState, useEffect } from 'react';

import Link from 'next/link';

import { useRouter } from 'next/navigation';

import { saveSession } from '@/utils/auth';

import { GoogleLogin } from '@react-oauth/google';

import { Capacitor } from '@capacitor/core';

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';



export default function Login() {

  const router = useRouter();

  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');

  const [loading, setLoading] = useState(false);



  useEffect(() => {

    if (typeof window !== 'undefined' && !localStorage.getItem('eaqari_system_reset_v2')) {

      localStorage.removeItem('eaqari_local_users');

      localStorage.removeItem('eaqari_token');

      localStorage.removeItem('eaqari_user');

      localStorage.setItem('eaqari_system_reset_v2', 'true');

    }

    

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

        if (data.needsProfileCompletion) {
          router.push('/complete-profile');
        } else {
          router.push('/');
        }

      } else {

        setError(data.message || 'فشل تسجيل الدخول بواسطة جوجل');

      }

    } catch (err) {

      setError('حدث خطأ أثناء الاتصال بالخادم');

    } finally {

      setLoading(false);

    }

  };



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    setError('');

    setLoading(true);



    // Admin Intercept

    if (email === 'admin' && password === 'admin') {

      const adminUser = {

        id: 0,

        full_name: 'مدير النظام',

        email: 'admin',

        phone: 'admin',

        role: 'Super Admin' as any,

        governorate: 'الفيوم',

      };

      saveSession('admin_jwt_token', adminUser);
      window.dispatchEvent(new Event('auth-changed'));

      router.push('/admin');

      setLoading(false);

      return;

    }



    try {

      const response = await fetch('https://eaqari.vercel.app/api/auth/login', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email, password }),

      });



      const data = await response.json();



      if (response.ok) {

        saveSession(data.token, data.user);
        window.dispatchEvent(new Event('auth-changed'));

        router.push('/');

        return;

      }

      setError(data.message || 'بيانات الدخول غير صحيحة');

    } catch (err: any) {

      // Fallback local simulation for offline testing

      const localUsers = JSON.parse(localStorage.getItem('eaqari_local_users') || '[]');

      const realUser = localUsers.find((u: any) => u.email === email);

      if (realUser) {

        saveSession('dummy_jwt_token', realUser);
        window.dispatchEvent(new Event('auth-changed'));

        router.push('/');

      } else {

        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');

      }

    } finally {

      setLoading(false);

    }

  };



  return (

    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">

      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
            <span className="text-2xl">🏠</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">مرحباً بك في عقاري <span className="text-xs font-normal text-gray-400">v4.0</span></h1>
          <p className="text-sm text-gray-500 mt-1">سجل دخولك للمتابعة</p>
        </div>



        {error && (

          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium text-center">

            {error}

          </div>

        )}



        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Email */}

          <div>

            <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">

              البريد الإلكتروني

            </label>

            <input

              id="email"

              type="text"

              value={email}

              onChange={e => setEmail(e.target.value)}

              required

              dir="ltr"

              placeholder="example@gmail.com"

              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none text-sm transition-colors bg-gray-50"

            />

          </div>



          {/* Password */}

          <div>

            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-1">

              كلمة المرور

            </label>

            <div className="relative">

              <input

                id="password"

                type={showPassword ? 'text' : 'password'}

                value={password}

                onChange={e => setPassword(e.target.value)}

                required

                placeholder="كلمة المرور"

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



          <div className="flex items-center justify-between text-sm pt-1">

            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">

              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />

              تذكرني

            </label>

            <a href="#" className="text-blue-600 font-medium hover:underline">

              نسيت كلمة المرور؟

            </a>

          </div>



          <button

            type="submit"

            disabled={loading}

            className="w-full py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"

          >

            {loading ? 'جاري التحميل...' : 'تسجيل الدخول →'}

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

              <span className="text-gray-700 font-bold text-sm">تسجيل الدخول باستخدام جوجل</span>

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

                    if (data.needsProfileCompletion) {
                      window.dispatchEvent(new Event('auth-changed'));
                      router.push('/complete-profile');
                    } else {
                      window.dispatchEvent(new Event('auth-changed'));
                      router.push('/');
                    }

                  } else {

                    setError(data.message || 'فشل تسجيل الدخول بواسطة جوجل');

                  }

                } catch (err) {

                  setError('حدث خطأ أثناء الاتصال بالخادم');

                } finally {

                  setLoading(false);

                }

              }}

              onError={() => {

                setError('فشل تسجيل الدخول بواسطة جوجل');

              }}

              text="continue_with"

              theme="outline"

              size="large"

              shape="rectangular"

              width="100%"

            />

          )}

        </div>



        {/* Guest Login Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              // In-memory + sessionStorage so it survives route changes
              (window as any).__eaqariGuest = true;
              sessionStorage.setItem('eaqari_guest', 'true');
              window.dispatchEvent(new Event('auth-changed'));
              router.push('/');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors"
          >
            <span>👀</span> الدخول كزائر
          </button>
        </div>



        <p className="text-center text-sm text-gray-600 mt-6">

          ليس لديك حساب؟{' '}

          <Link href="/register" className="text-blue-600 font-bold hover:underline">

            أنشئ حساباً جديداً

          </Link>

        </p>

      </div>

    </main>

  );

}

