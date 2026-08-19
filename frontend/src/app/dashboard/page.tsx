'use client';

import { API_BASE } from '@/utils/api';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, UserSession } from '@/utils/auth';

interface Property {
  id: number;
  title: string;
  price: string;
  type: string;
  operation: string;
  status: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGovernorate, setEditGovernorate] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Owner States
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newType, setNewType] = useState('شقة');
  const [newOperation, setNewOperation] = useState('بيع');
  const [newArea, setNewArea] = useState('');
  const [newRooms, setNewRooms] = useState('');
  const [newBaths, setNewBaths] = useState('');
  const [newDescription, setNewDescription] = useState('');
  useEffect(() => {
    const fetchMyAds = async (userId: number) => {
      try {
        const res = await fetch(`${API_BASE}/api/properties`);
        if (res.ok) {
          const data = await res.json();
          const userAds = data.filter((p: any) => p.owner_id === userId);
          const formatted = userAds.map((p: any) => ({
            id: p.id,
            title: p.description,
            price: p.price.toLocaleString() + (p.operation_type === 'rent' ? ' ج.م / شهر' : ' ج.م'),
            type: p.type,
            operation: p.operation_type === 'sale' ? 'بيع' : 'إيجار',
            status: p.status === 'active' ? 'منشور' : (p.status === 'pending' ? 'في انتظار المراجعة' : 'مرفوض'),
          }));
          setMyProperties(formatted);
        }
      } catch (error) {
        console.error("Error fetching my ads", error);
      }
    };

    const { user: currentSession } = getSession();
    if (!currentSession) {
      router.push('/login');
    } else {
      setUser(currentSession);
      setEditName(currentSession.full_name);
      setEditPhone(currentSession.phone || '');
      setEditGovernorate((currentSession as any).governorate || '');
      setEditCity((currentSession as any).city || '');
      setEditAddress((currentSession as any).address || '');
      fetchMyAds(currentSession.id);
    }
    setLoading(false);
  }, [router]);

  const handleLogoutConfirm = () => {
    clearSession();
    router.push('/login');
  };

  const handleAddProperty = (e: React.FormEvent) => {
    e.preventDefault();
    setShowAddForm(false);
    router.push('/add-property');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedUser = {
      ...user,
      full_name: editName,
      phone: editPhone,
      governorate: editGovernorate,
      city: editCity,
      address: editAddress,
    };
    setUser(updatedUser as UserSession);
    localStorage.setItem('eaqari_user', JSON.stringify(updatedUser));
    // Also sync to backend
    try {
      await fetch(`${API_BASE}/api/users/profile-completion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (user as any).email, full_name: editName, phone: editPhone, governorate: editGovernorate, city: editCity, address: editAddress }),
      });
    } catch (_) {}
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

  const infoRows = [
    { label: 'الاسم الكامل', value: user.full_name, icon: '👤' },
    { label: 'البريد الإلكتروني', value: (user as any).email || '—', icon: '📧' },
    { label: 'رقم الهاتف', value: user.phone || '—', icon: '📞' },
    { label: 'المحافظة', value: (user as any).governorate || '—', icon: '📍' },
    { label: 'المدينة', value: (user as any).city || '—', icon: '🏙️' },
    { label: 'العنوان', value: (user as any).address || '—', icon: '🏠' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-12" dir="rtl">
      {/* Quick Access Bar */}
      <div className="grid grid-cols-3 gap-2 pb-4">
        <Link
          href="/favorites"
          prefetch={false}
          className="flex flex-col items-center justify-center gap-1 bg-red-50 text-red-500 font-bold text-[11px] py-3.5 rounded-2xl border border-red-100 hover:bg-red-100 transition-colors shadow-sm"
        >
          <span className="text-xl">❤️</span> المفضلة
        </Link>
        <Link
          href="/chats"
          prefetch={false}
          className="flex flex-col items-center justify-center gap-1 bg-blue-50 text-blue-600 font-bold text-[11px] py-3.5 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm"
        >
          <span className="text-xl">💬</span> رسائلي
        </Link>
        <Link
          href="/notifications"
          prefetch={false}
          className="flex flex-col items-center justify-center gap-1 bg-amber-50 text-amber-600 font-bold text-[11px] py-3.5 rounded-2xl border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm"
        >
          <span className="text-xl">🔔</span> تنبيهاتي
        </Link>
        <Link
          href="/my-ads"
          prefetch={false}
          className="flex flex-col items-center justify-center gap-1 bg-emerald-50 text-emerald-600 font-bold text-[11px] py-3.5 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm"
        >
          <span className="text-xl">📋</span> إعلاناتي
        </Link>
        <Link
          href="/add-property"
          prefetch={false}
          className="flex flex-col items-center justify-center gap-1 bg-indigo-50 text-indigo-600 font-bold text-[11px] py-3.5 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors shadow-sm"
        >
          <span className="text-xl">➕</span> إضافة عقار
        </Link>
        <Link
          href="/about"
          prefetch={false}
          className="flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600 font-bold text-[11px] py-3.5 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors shadow-sm"
        >
          <span className="text-xl">ℹ️</span> حول التطبيق
        </Link>
      </div>
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowLogoutModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-4"
            style={{ animation: 'slideUp 0.3s ease' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-2 pb-4 border-b border-gray-100">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-3xl">🚪</div>
              <h2 className="text-lg font-black text-gray-900">تسجيل الخروج</h2>
              <p className="text-sm text-gray-500 text-center">هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-colors text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="flex-1 py-3.5 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-colors text-sm shadow-lg shadow-red-500/20"
              >
                نعم، خروج
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Header */}
      <div
        className="relative bg-gradient-to-br from-[#0d1f4e] to-[#1a56c4] px-5 pt-6 pb-10 mb-4"
        style={{ borderRadius: '0 0 30px 30px' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl border border-white/30 shrink-0">
            👤
          </div>
          <div>
            <h1 className="text-xl font-black text-white">{user.full_name}</h1>
            <p className="text-blue-200 text-xs mt-0.5">{(user as any).email || ''}</p>
            <span className="inline-block mt-1 bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {(user as any).role || 'مستخدم'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4 -mt-4 px-0">
        {/* Personal Info Card */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-sm text-gray-800">البيانات الشخصية</h3>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg"
            >
              {isEditing ? 'إلغاء' : '✏️ تعديل'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="p-5 space-y-3">
              {[
                { label: 'الاسم الكامل', value: editName, setter: setEditName, type: 'text', required: true },
                { label: 'رقم الهاتف', value: editPhone, setter: setEditPhone, type: 'tel', required: true },
                { label: 'المحافظة', value: editGovernorate, setter: setEditGovernorate, type: 'text', required: false },
                { label: 'المدينة أو المركز', value: editCity, setter: setEditCity, type: 'text', required: false },
                { label: 'العنوان التفصيلي', value: editAddress, setter: setEditAddress, type: 'text', required: false },
              ].map((field) => (
                <div key={field.label}>
                  <label className="text-xs font-bold text-gray-500 block mb-1">{field.label}{field.required && ' *'}</label>
                  <input
                    type={field.type}
                    required={field.required}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  />
                </div>
              ))}
              <button type="submit" className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors mt-2">
                حفظ البيانات
              </button>
            </form>
          ) : (
            <div className="divide-y divide-gray-50">
              {infoRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{row.icon}</span>
                    <span className="text-xs text-gray-400 font-medium">{row.label}</span>
                  </div>
                  <span className="text-sm text-gray-700 font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Properties */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-sm text-gray-800">عقاراتي المعروضة</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? 'إلغاء' : '＋ إعلان جديد'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddProperty} className="bg-gray-50 m-4 p-4 rounded-2xl border border-gray-100 space-y-3">
              <h4 className="font-bold text-xs text-gray-800">تفاصيل الإعلان</h4>
              <input type="text" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="عنوان الإعلان" className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" required value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="السعر" className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="المساحة م²" className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={newOperation} onChange={(e) => setNewOperation(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="بيع">للبيع</option><option value="إيجار">للإيجار</option>
                </select>
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>شقة</option><option>فيلا</option><option>شاليه</option><option>مكتب</option><option>أرض</option><option>محل</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" value={newRooms} onChange={(e) => setNewRooms(e.target.value)} placeholder="الغرف" className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" value={newBaths} onChange={(e) => setNewBaths(e.target.value)} placeholder="الحمامات" className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="الوصف..." className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500 h-16 resize-none" />
              <button type="submit" className="w-full bg-blue-600 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                حفظ ونشر الإعلان
              </button>
            </form>
          )}

          <div className="divide-y divide-gray-50">
            {myProperties.map((prop) => (
              <div key={prop.id} className="px-5 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">{prop.title}</h4>
                    <p className="text-xs text-blue-600 font-extrabold mt-1">{prop.price}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500 font-medium border border-gray-100">لل{prop.operation}</span>
                      <span className="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500 font-medium border border-gray-100">{prop.type}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                    prop.status === 'منشور' ? 'bg-green-100 text-green-700' :
                    prop.status.includes('تم') ? 'bg-gray-200 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {prop.status}
                  </span>
                </div>
                {!prop.status.includes('تم') && (
                  <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => setMyProperties(prev => prev.map(p => p.id === prop.id ? { ...p, status: prop.operation === 'بيع' ? 'تم البيع' : 'تم التأجير' } : p))}
                      className="flex-1 bg-gray-700 text-white text-[10px] font-bold py-1.5 rounded-lg"
                    >
                      {prop.operation === 'بيع' ? '✓ تم البيع' : '✓ تم التأجير'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-4 bg-red-50 text-red-600 font-bold text-sm rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
        >
          <span>🚪</span> تسجيل الخروج
        </button>

        {/* App Version */}
        <div className="text-center pt-6 pb-2">
          <span className="text-xs font-bold text-gray-400">Eaqari v2</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
