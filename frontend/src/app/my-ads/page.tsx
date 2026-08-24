'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/utils/api';

export default function MyAdsPage() {
  const router = useRouter();
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Get user from localStorage
    let user: any = null;
    try {
      const stored = localStorage.getItem('eaqari_user');
      if (stored) user = JSON.parse(stored);
    } catch {}

    if (!user || !user.id) {
      router.push('/login');
      return;
    }

    setUserId(user.id);
    loadMyAds(user.id);
  }, []);

  const loadMyAds = async (uid: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/properties?owner_id=${uid}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setAds(data);
      } else {
        setError('فشل تحميل الإعلانات');
      }
    } catch (e) {
      setError('تعذر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'active') return { label: 'منشور ✅', style: 'bg-green-100 text-green-700 border-green-300' };
    if (status === 'pending') return { label: 'قيد المراجعة ⏳', style: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
    if (status === 'rejected') return { label: 'مرفوض ❌', style: 'bg-red-100 text-red-700 border-red-300' };
    if (status === 'sold') return { label: 'مباع 🏷️', style: 'bg-gray-100 text-gray-700 border-gray-300' };
    if (status === 'rented') return { label: 'مؤجر 🔑', style: 'bg-blue-100 text-blue-700 border-blue-300' };
    return { label: status, style: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">جاري تحميل إعلاناتك...</p>
        </div>
      </div>
    );
  }

  const pendingCount = ads.filter(a => a.status === 'pending').length;
  const activeCount = ads.filter(a => a.status === 'active').length;
  const rejectedCount = ads.filter(a => a.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-black text-gray-800">إعلاناتي</h1>
            <p className="text-xs text-gray-400">{ads.length} إعلان إجمالي</p>
          </div>
          <Link
            href="/add-property"
            className="bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
          >
            ➕ إعلان جديد
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 rounded-2xl p-3 text-center border border-green-100">
            <div className="text-xl font-black text-green-700">{activeCount}</div>
            <div className="text-[10px] text-green-600 font-medium">منشورة</div>
          </div>
          <div className="bg-yellow-50 rounded-2xl p-3 text-center border border-yellow-100">
            <div className="text-xl font-black text-yellow-700">{pendingCount}</div>
            <div className="text-[10px] text-yellow-600 font-medium">قيد المراجعة</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-3 text-center border border-red-100">
            <div className="text-xl font-black text-red-600">{rejectedCount}</div>
            <div className="text-[10px] text-red-500 font-medium">مرفوضة</div>
          </div>
        </div>

        {/* Pending banner */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-black text-amber-800 text-sm">لديك {pendingCount} إعلان قيد المراجعة</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                سيظهر إعلانك للجميع بمجرد موافقة الإدارة. يستغرق ذلك عادةً أقل من 24 ساعة.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
            <p className="text-red-600 text-sm font-bold">{error}</p>
            <button
              onClick={() => userId && loadMyAds(userId)}
              className="mt-2 text-xs text-red-500 underline"
            >
              أعد المحاولة
            </button>
          </div>
        )}

        {/* Empty state */}
        {ads.length === 0 && !error && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 flex flex-col items-center gap-4 text-center">
            <div className="text-5xl">🏠</div>
            <div>
              <p className="font-black text-gray-800 text-base">لا يوجد إعلانات بعد</p>
              <p className="text-gray-400 text-sm mt-1">أضف أول إعلان عقاري الآن</p>
            </div>
            <Link
              href="/add-property"
              className="bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-2xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              ➕ إضافة إعلان
            </Link>
          </div>
        )}

        {/* Ads list */}
        {ads.length > 0 && (
          <div className="space-y-3">
            {ads.map(ad => {
              const { label, style } = getStatusLabel(ad.status);
              const imageUrl = ad.media?.[0]?.media_url;
              return (
                <div key={ad.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Image */}
                  {imageUrl && (
                    <div className="h-36 bg-gray-100 overflow-hidden">
                      <img
                        src={imageUrl}
                        alt="عقار"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-gray-800 leading-snug">
                          {ad.description || ad.type}
                        </h3>
                        <p className="text-blue-600 font-black text-base mt-1">
                          {Number(ad.price || 0).toLocaleString()} ج.م
                          {ad.operation_type === 'rent' ? ' / شهر' : ''}
                        </p>
                        <div className="flex gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded-lg border border-gray-100">
                            {ad.type}
                          </span>
                          <span className="text-[10px] bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded-lg border border-gray-100">
                            {ad.operation_type === 'sale' ? 'للبيع' : 'للإيجار'}
                          </span>
                          {ad.governorate && (
                            <span className="text-[10px] bg-gray-50 text-gray-500 font-medium px-2 py-0.5 rounded-lg border border-gray-100">
                              📍 {ad.governorate}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${style}`}>
                        {label}
                      </span>
                    </div>

                    {/* Rejection reason */}
                    {ad.status === 'rejected' && ad.rejection_reason && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-[11px] font-black text-red-700">سبب الرفض:</p>
                        <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{ad.rejection_reason}</p>
                      </div>
                    )}

                    {/* Pending info */}
                    {ad.status === 'pending' && (
                      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3">
                        <p className="text-[11px] text-yellow-700 leading-relaxed">
                          🔍 إعلانك تحت المراجعة من فريق الإدارة. سيُنشر تلقائياً بعد الموافقة عليه.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 border-t border-gray-50 pt-3">
                      <button
                        onClick={() => router.push(`/add-property?edit=${ad.id}`)}
                        className={`flex-1 font-bold text-xs py-2.5 rounded-xl transition-colors ${
                          ad.status === 'rejected'
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {ad.status === 'rejected' ? '✏️ تعديل وإعادة تقديم' : '✏️ تعديل'}
                      </button>
                      <Link
                        href={`/properties/${ad.id}`}
                        className="flex-1 bg-gray-50 text-gray-600 font-bold text-xs py-2.5 rounded-xl text-center hover:bg-gray-100 transition-colors"
                      >
                        👁 عرض
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
