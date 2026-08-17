'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/utils/auth';
import Link from 'next/link';

interface Property {
  id: number;
  title: string;
  price: string;
  type: string;
  operation: string;
  status: string;
  rawStatus: string;
  rejection_reason?: string | null;
}

export default function MyAdsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const { user } = getSession();
    setIsLoggedIn(!!user);
    if (user) {
      setUserId(user.id);
      const fetchMyAds = async () => {
        try {
          const res = await fetch(`https://eaqari.vercel.app/api/properties?owner_id=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            const formatted = data.map((p: any) => ({
              id: p.id,
              title: p.description,
              price: p.price.toLocaleString() + (p.operation_type === 'rent' ? ' ج.م / شهر' : ' ج.م'),
              type: p.type,
              operation: p.operation_type === 'sale' ? 'بيع' : 'إيجار',
              rawStatus: p.status,
              status:
                p.status === 'active' ? 'منشور' :
                p.status === 'pending' ? 'في انتظار المراجعة' :
                p.status === 'rejected' ? 'مرفوض' :
                p.status === 'sold' ? 'مباع' :
                p.status === 'rented' ? 'مؤجر' : p.status,
              rejection_reason: p.rejection_reason,
            }));
            setMyProperties(formatted);
          }
        } catch (error) {
          console.error("Error fetching my ads", error);
        } finally {
          setLoading(false);
        }
      }
      fetchMyAds();
    } else {
      setLoading(false);
    }
  }, []);


  // No delete for users - only admin can delete

  const statusColor: Record<string, string> = {
    'منشور': 'bg-green-50 text-green-600 border-green-200',
    'مباع': 'bg-emerald-50 text-emerald-600 border-emerald-200',
    'مؤجر': 'bg-teal-50 text-teal-600 border-teal-200',
    'في انتظار المراجعة': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'في انتظار مراجعة المسؤول': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    'مرفوض': 'bg-red-50 text-red-500 border-red-200',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in - show prompt
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center" dir="rtl">
        <div className="text-6xl">📋</div>
        <h2 className="text-xl font-black text-gray-800">إعلاناتي</h2>
        <p className="text-gray-500 text-sm max-w-xs">سجّل الدخول لترى إعلاناتك وتتمكن من إدارتها</p>
        <Link
          href="/login"
          className="bg-blue-600 text-white font-bold px-6 py-3 rounded-2xl text-sm hover:bg-blue-700 transition-colors shadow-sm"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const activeCount = myProperties.filter(p => ['منشور', 'مباع', 'مؤجر'].includes(p.status)).length;
  const pendingCount = myProperties.filter(p => p.status.includes('انتظار')).length;
  const rejectedCount = myProperties.filter(p => p.status === 'مرفوض').length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-800">إعلاناتي</h1>
          <p className="text-xs text-gray-400 mt-0.5">{myProperties.length} إعلان بإجمالي ({activeCount} منشورة)</p>
        </div>
        <Link
          href="/add-property"
          className="flex items-center gap-1.5 bg-blue-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <span className="text-base">➕</span> إعلان جديد
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'كل الإعلانات', value: myProperties.length, icon: '📋', color: 'bg-blue-50 text-blue-600' },
          { label: 'منشورة', value: activeCount, icon: '✅', color: 'bg-green-50 text-green-600' },
          { label: 'قيد المراجعة', value: pendingCount, icon: '⏳', color: 'bg-yellow-50 text-yellow-600' },
          { label: 'مرفوضة', value: rejectedCount, icon: '❌', color: 'bg-red-50 text-red-500' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-2xl p-3 text-center border border-current/10`}>
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-lg font-black">{s.value}</div>
            <div className="text-[10px] font-medium opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {myProperties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-5xl">🏠</div>
          <p className="text-gray-400 font-medium text-sm">لا توجد إعلانات بعد</p>
          <Link href="/add-property" className="bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl">
            أضف أول إعلان
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myProperties.map(prop => (
            <div key={prop.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-gray-800 leading-tight">{prop.title}</h3>
                  <p className="text-blue-600 font-black text-sm mt-1">{prop.price}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] bg-gray-50 text-gray-500 font-bold px-2 py-0.5 rounded-lg border border-gray-100">
                      {prop.type}
                    </span>
                    <span className="text-[10px] bg-gray-50 text-gray-500 font-bold px-2 py-0.5 rounded-lg border border-gray-100">
                      لل{prop.operation}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border shrink-0 ${statusColor[prop.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {prop.status}
                </span>
              </div>

              {prop.rawStatus === 'rejected' && prop.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-500">⚠️</span>
                    <p className="text-xs font-black text-red-700">سبب الرفض من قبل فريق المراجعة:</p>
                  </div>
                  <p className="text-xs text-red-600 leading-relaxed pr-6 whitespace-pre-line">
                    {prop.rejection_reason}
                  </p>
                </div>
              )}

              <div className="flex gap-2 border-t border-gray-50 pt-3">
                <Link
                  href={`/properties/${prop.id}`}
                  className="flex-1 bg-gray-50 text-gray-600 font-bold text-xs py-2 rounded-xl text-center hover:bg-gray-100 transition-colors"
                >
                  👁 عرض
                </Link>
                <button
                  onClick={() => router.push(`/add-property?edit=${prop.id}`)}
                  className={`flex-1 ${prop.rawStatus === 'rejected' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} font-bold text-xs py-2 rounded-xl transition-colors`}
                >
                  {prop.rawStatus === 'rejected' ? '✏️ تعديل وإعادة تقديم' : '✏️ تعديل'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account link */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm text-gray-800">الملف الشخصي والإعدادات</p>
          <p className="text-xs text-gray-400 mt-0.5">عرض بياناتك وتعديل معلوماتك</p>
        </div>
        <Link
          href="/dashboard"
          className="bg-gray-100 text-gray-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-1.5"
        >
          👤 حسابي
        </Link>
      </div>

    </div>
  );
}
