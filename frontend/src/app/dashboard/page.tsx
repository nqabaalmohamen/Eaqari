'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/utils/api';
import { getSession, clearSession, UserSession } from '@/utils/auth';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ads, setAds] = useState<any[]>([]);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGovernorate, setEditGovernorate] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [openingAdminChat, setOpeningAdminChat] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  };

  const openAdminChat = async () => {
    if (!user || openingAdminChat) return;
    setOpeningAdminChat(true);
    try {
      const user_id = parseInt(String(user.id), 10);
      if (isNaN(user_id)) {
        showMsg('معرف المستخدم غير صالح', 'err');
        return;
      }
      const res = await fetch(`${API_BASE}/api/chats/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({ user_id })
      });
      if (!res.ok) {
        showMsg(`فشل الاتصال: ${res.status}`, 'err');
        return;
      }
      const data = await res.json();
      if (data.conversation?.id) {
        showMsg('جاري فتح الدردشة...', 'ok');
        const path = `/admin-chat/${data.conversation.id}`;
        try { router.push(path); } catch {}
        setTimeout(() => {
          try {
            if (typeof window !== 'undefined' && window.location.pathname !== path) {
              window.location.href = path;
            }
          } catch {}
        }, 250);
      } else {
        console.error('no conversation returned:', data);
        showMsg('تعذر فتح الدردشة', 'err');
      }
    } catch (e: any) {
      console.error('openAdminChat error:', e);
      showMsg(`خطأ الشبكة: ${e?.message || 'غير معروف'}`, 'err');
    } finally {
      setOpeningAdminChat(false);
    }
  };

  useEffect(() => {
    const { user: currentUser } = getSession();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setEditName(currentUser.full_name || '');
    setEditPhone(currentUser.phone || '');
    setEditGovernorate((currentUser as any).governorate || '');
    setEditCity((currentUser as any).city || '');
    setEditAddress((currentUser as any).address || '');
    loadMyAds(currentUser.id);
  }, []);

  const loadMyAds = async (uid: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/properties?owner_id=${uid}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated = { ...user, full_name: editName, phone: editPhone, governorate: editGovernorate, city: editCity, address: editAddress };
    setUser(updated as UserSession);
    localStorage.setItem('eaqari_user', JSON.stringify(updated));
    try {
      await fetch(`${API_BASE}/api/users/profile-completion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (user as any).email, full_name: editName, phone: editPhone, governorate: editGovernorate, city: editCity, address: editAddress }),
      });
    } catch {}
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const pendingCount = ads.filter(a => a.status === 'pending').length;
  const activeCount = ads.filter(a => a.status === 'active').length;

  return (
    <main className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 24, zIndex: 9999 }}>
          <div style={{
            padding: '10px 18px',
            borderRadius: 999,
            background: toast.type === 'ok' ? '#10b981' : '#ef4444',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          }}>{toast.text}</div>
        </div>
      )}
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 pt-10 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black shadow-lg">
            {(user.full_name || '?').charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-black">{user.full_name}</h1>
            <p className="text-blue-100 text-xs mt-0.5">{(user as any).email || (user as any).role || 'مستخدم'}</p>
            <p className="text-blue-100 text-xs">{user.phone || ''}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'إعلاناتي', value: ads.length, icon: '📋' },
            { label: 'منشورة', value: activeCount, icon: '✅' },
            { label: 'قيد المراجعة', value: pendingCount, icon: '⏳' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-black mt-0.5">{s.value}</div>
              <div className="text-[10px] text-blue-100 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/my-ads" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <span className="text-2xl">📋</span>
            <div>
              <p className="font-bold text-sm text-gray-800">إعلاناتي</p>
              <p className="text-xs text-gray-400">{ads.length} إعلان</p>
            </div>
          </Link>
          <Link href="/add-property" className="bg-blue-600 rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:bg-blue-700 transition-colors">
            <span className="text-2xl">➕</span>
            <div>
              <p className="font-bold text-sm text-white">إعلان جديد</p>
              <p className="text-xs text-blue-100">أضف عقارك الآن</p>
            </div>
          </Link>
        </div>

        {/* Contact Admin Chat Button */}
        <button
          onClick={openAdminChat}
          disabled={openingAdminChat}
          className={`w-full rounded-2xl p-4 flex items-center gap-4 shadow-sm transition-all ${
            openingAdminChat ? 'opacity-80 cursor-wait' : 'hover:shadow-lg active:scale-[0.98]'
          }`}
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #c084fc 100%)',
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shrink-0">
            {openingAdminChat ? (
              <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <span>💬</span>
            )}
          </div>
          <div className="flex-1 text-right">
            <p className="font-black text-sm text-white">تواصل مع الإدارة</p>
            <p className="text-xs text-purple-100 mt-0.5">دردشة مباشرة مع فريق الدعم الفني</p>
          </div>
          <svg viewBox="0 0 64 64" fill="white" className="w-9 h-9 shrink-0">
            <rect x="18" y="20" width="28" height="24" rx="5" ry="5"/>
            <rect x="24" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed"/>
            <rect x="34" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed"/>
            <rect x="27" y="37" width="10" height="3" rx="1.5" ry="1.5" fill="#7c3aed"/>
            <rect x="30" y="12" width="4" height="8" rx="2" ry="2"/>
            <circle cx="32" cy="10" r="4"/>
            <rect x="10" y="28" width="5" height="10" rx="2.5" ry="2.5"/>
            <rect x="49" y="28" width="5" height="10" rx="2.5" ry="2.5"/>
            <rect x="22" y="44" width="6" height="7" rx="2" ry="2"/>
            <rect x="36" y="44" width="6" height="7" rx="2" ry="2"/>
          </svg>
        </button>

        {/* Pending notice */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-black text-amber-800 text-sm">{pendingCount} إعلان قيد مراجعة الإدارة</p>
              <p className="text-xs text-amber-600 mt-1">سيظهر إعلانك بعد الموافقة عليه</p>
            </div>
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-sm text-gray-800">البيانات الشخصية</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
            >
              {isEditing ? 'إلغاء' : '✏️ تعديل'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="p-5 space-y-3">
              {[
                { label: 'الاسم الكامل', val: editName, set: setEditName, type: 'text', req: true },
                { label: 'رقم الهاتف', val: editPhone, set: setEditPhone, type: 'tel', req: true },
                { label: 'المحافظة', val: editGovernorate, set: setEditGovernorate, type: 'text', req: false },
                { label: 'المدينة', val: editCity, set: setEditCity, type: 'text', req: false },
                { label: 'العنوان', val: editAddress, set: setEditAddress, type: 'text', req: false },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-bold text-gray-500 block mb-1">{f.label}{f.req && ' *'}</label>
                  <input
                    type={f.type}
                    required={f.req}
                    value={f.val}
                    onChange={e => f.set(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
              ))}
              <button type="submit" className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors">
                حفظ البيانات
              </button>
            </form>
          ) : (
            <div className="divide-y divide-gray-50">
              {[
                { label: 'الاسم', value: user.full_name, icon: '👤' },
                { label: 'البريد', value: (user as any).email || '—', icon: '📧' },
                { label: 'الهاتف', value: user.phone || '—', icon: '📞' },
                { label: 'المحافظة', value: (user as any).governorate || '—', icon: '📍' },
                { label: 'المدينة', value: (user as any).city || '—', icon: '🏙️' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span>{r.icon}</span>
                    <span className="text-xs text-gray-400 font-medium">{r.label}</span>
                  </div>
                  <span className="text-sm text-gray-700 font-semibold">{r.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Ads Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-sm text-gray-800">إعلاناتي ({ads.length})</h3>
            <Link href="/my-ads" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
              عرض الكل
            </Link>
          </div>

          {ads.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-gray-400 text-sm">لا يوجد إعلانات بعد</p>
              <Link href="/add-property" className="mt-3 inline-block text-blue-600 font-bold text-xs underline">
                أضف إعلانك الأول
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {ads.slice(0, 3).map(ad => (
                <div key={ad.id} className="px-5 py-3.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">{ad.description || ad.type}</p>
                    <p className="text-xs text-blue-600 font-bold">{Number(ad.price || 0).toLocaleString()} ج.م</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${
                    ad.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                    ad.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    ad.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {ad.status === 'active' ? 'منشور ✅' : ad.status === 'pending' ? 'مراجعة ⏳' : ad.status === 'rejected' ? 'مرفوض ❌' : ad.status}
                  </span>
                </div>
              ))}
              {ads.length > 3 && (
                <div className="px-5 py-3 text-center">
                  <Link href="/my-ads" className="text-xs text-blue-600 font-bold">
                    + {ads.length - 3} إعلانات أخرى → عرض الكل
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-4 bg-red-50 text-red-600 font-bold text-sm rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          🚪 تسجيل الخروج
        </button>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 space-y-4">
            <h3 className="font-black text-gray-800 text-center text-base">تسجيل الخروج</h3>
            <p className="text-gray-500 text-sm text-center">هل أنت متأكد من تسجيل الخروج؟</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="py-3 bg-gray-100 text-gray-700 font-bold text-sm rounded-2xl"
              >
                إلغاء
              </button>
              <button
                onClick={() => { clearSession(); router.push('/login'); }}
                className="py-3 bg-red-500 text-white font-bold text-sm rounded-2xl"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
