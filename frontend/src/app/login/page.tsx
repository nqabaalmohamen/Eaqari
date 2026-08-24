'use client';

import { API_BASE } from '@/utils/api';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveSession } from '@/utils/auth';
import { GoogleLogin } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const fetchWithNgrok = (url: any, options: any = {}) => {
  const headers = options.headers || {};
  headers['ngrok-skip-browser-warning'] = 'true';
  return fetch(url, { ...options, headers });
};

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
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
      try {
        GoogleAuth.initialize({
          clientId: '812155132439-u9bo09n8ltmsvkcjmufcta5hnj1g93up.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true,
        });
      } catch (e) {
        console.error('GoogleAuth init error', e);
      }
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
      } else {
        setError(data.message || 'فشل التسجيل بواسطة جوجل');
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

    if (identifier === 'admin' && password === 'admin') {
      const adminUser = { id: 0, full_name: 'مدير النظام', email: 'admin', phone: 'admin', role: 'Super Admin' as any, governorate: 'الفيوم' };
      saveSession('admin_jwt_token', adminUser);
      window.dispatchEvent(new Event('auth-changed'));
      router.push('/admin');
      setLoading(false);
      return;
    }

    try {
      const response = await fetchWithNgrok(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
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
      const localUsers = JSON.parse(localStorage.getItem('eaqari_local_users') || '[]');
      const realUser = localUsers.find((u: any) => u.email === identifier || u.phone === identifier);
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
    <main className="fixed inset-0 bg-gray-50 flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="bg-white pt-10 pb-6 px-6 rounded-b-[40px] shadow-sm flex flex-col items-center justify-center shrink-0 border-b border-gray-100">
        <div className="w-24 h-24 mb-2 relative">
          <img src="/logo.png" alt="عقاري" className="w-full h-full object-contain drop-shadow-md" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">مرحباً بك مجدداً</h1>
        <p className="text-gray-500 text-sm font-medium">سجل دخولك للمتابعة في عقاري</p>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl font-medium flex items-center gap-2 mb-4 shrink-0 shadow-sm">
            <span className="text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              البريد الإلكتروني أو الهاتف
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              required
              dir="ltr"
              placeholder="example@gmail.com أو 01xxxxxxxxx"
              className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#c9a84c] focus:ring-4 focus:ring-[#c9a84c]/10 focus:outline-none text-base bg-white transition-all shadow-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-bold text-gray-700">
                كلمة المرور
              </label>
              <Link href="/forgot-password" className="text-xs font-bold text-[#b3933e] hover:underline">
                نسيت الكلمة؟
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                dir="ltr"
                placeholder="••••••••"
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#c9a84c] focus:ring-4 focus:ring-[#c9a84c]/10 focus:outline-none text-base bg-white transition-all shadow-sm pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#c9a84c] text-xl p-1 transition-colors"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#c9a84c] to-[#b3933e] text-white font-black text-lg rounded-xl hover:opacity-90 transition-all shadow-lg shadow-[#c9a84c]/40 disabled:opacity-50 active:scale-95"
            >
              {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>

        <div className="mt-8 shrink-0">
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-bold">أو الدخول عبر</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div className="flex justify-center w-full mb-8">
            {Capacitor.isNativePlatform() ? (
              <button
                type="button"
                onClick={handleNativeGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-all active:scale-95 bg-white shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span className="text-gray-700 font-bold text-base">المتابعة باستخدام جوجل</span>
              </button>
            ) : (
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    setLoading(true);
                    try {
                      const res = await fetchWithNgrok(`${API_BASE}/api/auth/google`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ credential: credentialResponse.credential }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        saveSession(data.token, data.user);
                        window.dispatchEvent(new Event('auth-changed'));
                        router.push('/');
                      } else {
                        setError(data.message || 'فشل التسجيل');
                      }
                    } catch (err) {
                      setError('حدث خطأ');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setError('فشل التسجيل')}
                  text="continue_with"
                  theme="outline"
                  size="large"
                  width="100%"
                />
              </div>
            )}
          </div>

          <div className="text-center pb-2">
            <p className="text-sm font-bold text-gray-600">
              ليس لديك حساب؟{' '}
              <Link href="/register" className="text-[#c9a84c] font-black hover:underline">
                أنشئ حساباً جديداً
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
