'use client';

import { API_BASE } from '@/utils/api';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/utils/auth';

interface Property {
  id: number;
  title: string;
  type: string;
  operation: string;
  price: string;
  area: string;
  rooms: number;
  baths: number;
  kitchens?: number;
  halls?: number;
  hasPool?: boolean;
  floor?: number;
  totalFloors?: number;
  finishing: string;
  location: string;
  governorate: string;
  city: string;
  address: string;
  description: string;
  image: string;
  images?: string[];
  verified: boolean;
  owner: string;
  ownerPhone: string;
  ownerId?: number;
  date: string;
  status?: string;
  district?: string;
  features?: string[];
  isLicensed?: boolean;
  views?: number;
  rejection_reason?: string | null;
}

export default function PropertyDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const propId = parseInt(id) || 1;
  const [property, setProperty] = useState<Property | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'notfound' | 'hidden'>('loading');
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favMsg, setFavMsg] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showConfirmStatusModal, setShowConfirmStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');

  useEffect(() => {
    const { user } = getSession();
    if (user) {
      setCurrentUserId(user.id);
    }

    const fetchProperty = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/properties/${propId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (!res.ok) {
          setLoadState('notfound');
          return;
        }
        const p = await res.json();
        if (!p) { setLoadState('notfound'); return; }

        const owner_id = p.owner_id ?? p.owner?.id;
        const status = p.status || 'active';
        const isCurrentUserOwner = !!user && user.id === owner_id;
        setIsOwner(isCurrentUserOwner);

        const feats = p.features?.other_features || p.features || {};
        const formatted: Property = {
          id: p.id,
          title: p.description || (p.type + ' للبيع'),
          type: p.type,
          operation: p.operation_type === 'sale' ? 'بيع' : 'إيجار',
          price: (p.price?.toLocaleString('ar-EG') || '0') + (p.operation_type === 'rent' ? ' ج.م / شهر' : ' ج.م'),
          area: p.area ? String(p.area) + 'م²' : 'غير محدد',
          rooms: p.rooms || 0,
          baths: p.bathrooms || 0,
          kitchens: feats.kitchens || 1,
          halls: feats.halls || 1,
          hasPool: feats.has_pool || false,
          location: String(p.city || '') + (p.region ? '، ' + p.region : ''),
          district: p.city,
          city: p.city || '',
          address: p.region || '',
          image: p.media && p.media.length > 0
            ? p.media[0].media_url
            : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600',
          images: p.media && p.media.length > 0
            ? p.media.map((m: any) => m.media_url)
            : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600'],
          verified: p.owner?.is_verified || false,
          owner: p.owner?.full_name || 'مستخدم',
          ownerId: owner_id,
          isLicensed: p.features?.is_licensed || false,
          features: [
            ...(p.features?.has_elevator ? ['مصعد'] : []),
            ...(p.features?.has_parking ? ['موقف سيارات'] : []),
            ...(p.features?.has_electricity
              ? [p.features.electricity_meter_type === 'كودي' ? 'عداد كهرباء (كودي)' : 'عداد كهرباء (قانوني)']
              : []),
            ...(p.features?.has_water ? ['عداد مياه'] : []),
            ...(p.features?.has_gas ? ['عداد غاز'] : []),
            ...(feats.has_pool ? ['حمام سباحة'] : []),
          ],
          floor: p.floor || undefined,
          totalFloors: p.total_floors || undefined,
          finishing: p.finishing_type || '',
          governorate: p.governorate || 'الفيوم',
          ownerPhone: p.owner?.phone || '',
          description: p.description || '',
          date: p.created_at ? new Date(p.created_at).toLocaleDateString('ar-EG') : 'منذ قليل',
          views: p._count?.views || 0,
          status: status,
          rejection_reason: p.rejection_reason ?? null,
        };

        if (status === 'rejected' || status === 'pending') {
          if (!isCurrentUserOwner) {
            setLoadState('hidden');
            return;
          }
        }

        setProperty(formatted);
        setLoadState('loaded');

        // Record a view
        try {
          await fetch(`${API_BASE}/api/properties/${propId}/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ user_id: user?.id || null })
          });
        } catch (e) { /* ignore */ }
      } catch (err) {
        console.error('Error fetching property:', err);
        setLoadState('notfound');
      }
    };
    fetchProperty();

    try {
      const stored = JSON.parse(localStorage.getItem('eaqari_favorites') || '[]');
      setIsFavorite(stored.includes(propId));
    } catch { /* ignore */ }
  }, [propId]);

  const toggleFavorite = () => {
    try {
      const stored: number[] = JSON.parse(localStorage.getItem('eaqari_favorites') || '[]');
      let updated: number[];
      if (isFavorite) {
        updated = stored.filter((fid) => fid !== propId);
        setFavMsg('تمت الإزالة من المفضلة');
      } else {
        updated = [...stored, propId];
        setFavMsg('تمت الإضافة إلى المفضلة');
      }
      localStorage.setItem('eaqari_favorites', JSON.stringify(updated));
      setIsFavorite(!isFavorite);
      setTimeout(() => setFavMsg(''), 2000);
    } catch { /* ignore */ }
  };

  const requireAuth = (callback: () => void) => {
    const { user } = getSession();
    if (!user) { setShowLoginModal(true); return; }
    callback();
  };

  const handleUpdateStatus = async (newStatus: string) => {
    requireAuth(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/properties/${propId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          setProperty(prev => prev ? { ...prev, status: newStatus } : prev);
          setShowConfirmStatusModal(false);
        }
      } catch (e) { console.error(e); }
    });
  };

  const handleStartAdminChat = async () => {
    requireAuth(async () => {
      const { user } = getSession();
      if (!user) return;
      try {
        const res = await fetch(`${API_BASE}/api/chats/create-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ user_id: user.id })
        });
        const data = await res.json();
        router.push(data.conversation?.id ? `/chats/${data.conversation.id}` : '/chats');
      } catch (e) { router.push('/chats'); }
    });
  };

  const handleReport = async () => {
    requireAuth(async () => {
      if (!reportReason.trim()) { setReportError('يرجى كتابة سبب البلاغ'); return; }
      setReportSending(true); setReportError('');
      try {
        const { user } = getSession();
        await fetch(`${API_BASE}/api/properties/${propId}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reporter_id: user?.id || 1, reason: reportReason })
        });
        setReportSent(true);
        setTimeout(() => { setShowReportModal(false); setReportSent(false); setReportReason(''); }, 2500);
      } catch (e) {
        setReportError('حدث خطأ، يرجى المحاولة مجدداً');
      } finally { setReportSending(false); }
    });
  };

  const handleStartChat = async () => {
    requireAuth(async () => {
      const { user } = getSession();
      if (!property || !user) return;
      const ownerId = property.ownerId || 1;
      if (user.id === ownerId) return;
      try {
        const res = await fetch(`${API_BASE}/api/chats/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ buyer_id: user.id, owner_id: ownerId, property_id: propId })
        });
        const data = await res.json();
        router.push(data.conversation?.id ? `/chats/${data.conversation.id}` : '/chats');
      } catch (e) { router.push('/chats'); }
    });
  };

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-bold">جاري تحميل بيانات الإعلان...</p>
      </div>
    );
  }

  if (loadState === 'notfound') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <div className="text-7xl">🔍</div>
        <h2 className="text-xl font-black text-gray-800">الإعلان غير موجود</h2>
        <p className="text-gray-500 text-sm max-w-xs">قد يكون هذا الإعلان قد تم حذفه أو أن الرابط غير صحيح.</p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button onClick={() => router.push('/')} className="bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-2xl hover:bg-blue-700 transition-colors">🏠 عرض جميع العقارات</button>
          <button onClick={() => router.back()} className="bg-gray-100 text-gray-700 font-bold text-sm px-6 py-3 rounded-2xl hover:bg-gray-200 transition-colors">رجوع</button>
        </div>
      </div>
    );
  }

  if (loadState === 'hidden') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl">
        <div className="text-7xl">🚫</div>
        <h2 className="text-xl font-black text-gray-800">هذا الإعلان غير متاح حالياً</h2>
        <p className="text-gray-500 text-sm max-w-xs">هذا الإعلان قيد المراجعة أو تم رفضه من قبل فريق الإدارة.</p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button onClick={() => router.push('/')} className="bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-2xl hover:bg-blue-700 transition-colors">🏠 تصفح العقارات المتاحة</button>
          <button onClick={() => router.back()} className="bg-gray-100 text-gray-700 font-bold text-sm px-6 py-3 rounded-2xl hover:bg-gray-200 transition-colors">رجوع</button>
        </div>
      </div>
    );
  }

  if (!property) return null;

  return (
    <div className="space-y-4 pb-24" dir="rtl">
      <button onClick={() => router.back()}
        className="flex items-center gap-1 text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors w-fit">
        رجوع
      </button>

      {favMsg && <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-4 py-2.5 rounded-xl text-center">{favMsg}</div>}

      {/* Owner banners */}
      {isOwner && property.status === 'rejected' && (
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0"><span className="text-3xl">🚫</span></div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-red-700">تم رفض هذا الإعلان</h3>
              <p className="text-xs text-red-500 font-medium">هذا الإعلان غير منشور للعامة — لا يظهر لأي مستخدم آخر.</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-red-100 p-4 space-y-1.5 mt-2">
            <p className="text-xs font-black text-red-600">📝 سبب الرفض من الإدارة:</p>
            <p className="text-sm text-red-800 leading-loose pr-1">{property.rejection_reason || 'لا يوجد سبب مذكور — يمكنك التواصل مع الإدارة لمعرفة التفاصيل.'}</p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => router.push(`/add-property?edit=${property.id}`)} className="flex-1 bg-blue-600 text-white font-bold text-sm py-3 rounded-2xl hover:bg-blue-700 transition-colors">✏️ تعديل وإعادة النشر</button>
            <button onClick={() => router.push('/dashboard')} className="flex-1 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-2xl hover:bg-gray-200 transition-colors">لوحة تحكمي</button>
          </div>
        </div>
      )}

      {isOwner && property.status === 'pending' && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center shrink-0"><span className="text-3xl">⏳</span></div>
            <div className="flex-1">
              <h3 className="font-black text-lg text-yellow-700">قيد المراجعة</h3>
              <p className="text-xs text-yellow-600 font-medium">هذا الإعلان لا يظهر للعامة حالياً — ينتظر مراجعة فريق الإدارة قبل النشر.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Image */}
      <div className="relative h-56 w-full rounded-3xl overflow-hidden shadow-sm bg-gray-100">
        <img src={property.image} alt={property.title} className="object-cover w-full h-full" />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className="bg-blue-600/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">لل{property.operation}</span>
          {property.verified && <span className="bg-green-600/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full">موثق</span>}
          {property.status && property.status !== 'active' && property.status !== 'pending' && property.status !== 'rejected' && (
            <span className="bg-red-600/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">
              {property.status === 'sold' ? 'تم البيع' : 'تم التأجير'}
            </span>
          )}
          {isOwner && property.status && (property.status === 'rejected' || property.status === 'pending') && (
            <span className={`${property.status === 'rejected' ? 'bg-red-600/90' : 'bg-yellow-600/90'} text-white text-[10px] font-bold px-3 py-1.5 rounded-full`}>
              {property.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
            </span>
          )}
        </div>
        <button onClick={toggleFavorite}
          className={`absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-all ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/80'}`}>
          {isFavorite ? '❤' : '🤍'}
        </button>
      </div>

      {/* Title & Price */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-2 relative">
        <div className="flex justify-between items-center">
          <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg w-fit block">{property.type}</span>
          <span className="text-xs text-gray-400 font-medium flex items-center gap-1">👁 {property.views} مشاهدة</span>
        </div>
        <h1 className="text-lg font-black text-gray-800 leading-tight">{property.title}</h1>
        <p className="text-2xl font-black text-blue-600">{property.price}</p>
        <p className="text-xs text-gray-400">📍 {property.location}</p>
      </div>

      {/* Key specs */}
      {property.type !== 'أرض' && (
        <div className="grid grid-cols-2 gap-3">
          {property.type !== 'محل' && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-xl">📐</span>
              <div>
                <span className="text-gray-400 text-[10px] font-medium block">المساحة</span>
                <span className="text-gray-700 font-black text-sm">{property.area}</span>
              </div>
            </div>
          )}
          {property.type === 'محل' && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-xl">📐</span>
              <div>
                <span className="text-gray-400 text-[10px] font-medium block">المساحة</span>
                <span className="text-gray-700 font-black text-sm">{property.area}</span>
              </div>
            </div>
          )}
          {property.type !== 'محل' && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-xl">🛏</span>
              <div>
                <span className="text-gray-400 text-[10px] font-medium block">الغرف</span>
                <span className="text-gray-700 font-black text-sm">{property.rooms} غرفة</span>
              </div>
            </div>
          )}
          {property.type !== 'محل' && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-xl">🚿</span>
              <div>
                <span className="text-gray-400 text-[10px] font-medium block">الحمامات</span>
                <span className="text-gray-700 font-black text-sm">{property.baths} حمام</span>
              </div>
            </div>
          )}
          {property.type !== 'محل' && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-xl">🍳</span>
              <div>
                <span className="text-gray-400 text-[10px] font-medium block">المطابخ</span>
                <span className="text-gray-700 font-black text-sm">{property.kitchens} مطبخ</span>
              </div>
            </div>
          )}
          {(property.type === 'شقة' || property.type === 'منزل' || property.type === 'فيلا') && (
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-xl">🛋</span>
              <div>
                <span className="text-gray-400 text-[10px] font-medium block">الصالات</span>
                <span className="text-gray-700 font-black text-sm">{property.halls} صالة</span>
              </div>
            </div>
          )}
        </div>
      )}
      {property.type === 'أرض' && (
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-2">
          <span className="text-xl">📐</span>
          <div>
            <span className="text-gray-400 text-[10px] font-medium block">المساحة</span>
            <span className="text-gray-700 font-black text-sm">{property.area}</span>
          </div>
        </div>
      )}

      {/* Description & Finishing */}
      {property.description && (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">📝 الوصف والتشطيب</h3>
          <p className="text-sm text-gray-600 leading-loose">{property.description}</p>
        </div>
      )}

      {/* Location Details */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">📍 تفاصيل الموقع</h3>
        <div className="grid grid-cols-2 gap-y-3 text-xs">
          <div><span className="text-gray-400 font-medium block">المحافظة</span><span className="text-gray-700 font-bold">{property.governorate}</span></div>
          <div><span className="text-gray-400 font-medium block">المدينة / المركز</span><span className="text-gray-700 font-bold">{property.city}</span></div>
          {property.address && (
            <div className="col-span-2">
              <span className="text-gray-400 font-medium block">العنوان بالتفصيل</span>
              <span className="text-gray-700 font-bold">{property.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Property Details */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">🏠 تفاصيل العقار</h3>
        <div className="grid grid-cols-2 gap-y-3 text-xs">
          {(property.type === 'شقة' || property.type === 'مكتب') && property.floor && <div><span className="text-gray-400 font-medium block">الدور</span><span className="text-gray-700 font-bold">{property.floor}</span></div>}
          {property.type === 'منزل' && property.totalFloors && <div><span className="text-gray-400 font-medium block">عدد الأدوار</span><span className="text-gray-700 font-bold">{property.totalFloors}</span></div>}
          {property.finishing && property.type !== 'أرض' && <div><span className="text-gray-400 font-medium block">التشطيب</span><span className="text-gray-700 font-bold">{property.finishing}</span></div>}
          <div><span className="text-gray-400 font-medium block">تاريخ الإعلان</span><span className="text-gray-700 font-bold">{property.date}</span></div>
        </div>
      </div>

      {/* Legal Status */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">⚖️ الوضع القانوني</h3>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${property.isLicensed ? 'bg-green-500' : 'bg-red-400'}`} />
          <span className={`text-sm font-bold ${property.isLicensed ? 'text-green-700' : 'text-red-600'}`}>
            {property.isLicensed ? 'العقار مرخص (أوراق رسمية)' : 'العقار غير مرخص'}
          </span>
        </div>
      </div>

      {/* Utilities & Features */}
      {property.features && property.features.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">🔧 المرافق والمميزات</h3>
          <div className="flex flex-wrap gap-2">
            {property.features.map((f) => (
              <span key={f} className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-100">{f}</span>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {(property.status === 'active' || property.status === 'sold' || property.status === 'rented' || isOwner) && (
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">👤</div>
            <div className="flex-1">
              <h4 className="font-bold text-sm text-gray-800">{property.owner}</h4>
              <span className={`text-[10px] font-bold ${property.verified ? 'text-green-600' : 'text-gray-400'}`}>
                {property.verified ? 'مالك موثق' : 'حساب غير موثق'}
              </span>
            </div>
          </div>
          {!isOwner ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { const { user } = getSession(); if (!user) { router.push('/login'); return; } window.location.href = 'tel:' + property.ownerPhone; }}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition-colors text-sm">
                📞 اتصال
              </button>
              <button onClick={handleStartChat} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition-colors text-sm">
                💬 محادثة
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => router.push(`/add-property?edit=${property.id}`)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-2xl transition-colors text-sm">✏️ تعديل</button>
                <button onClick={() => router.push('/my-ads')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl transition-colors text-sm">إعلاناتي</button>
              </div>
              {property.status === 'active' && (
                <button 
                  onClick={() => {
                    setPendingStatus(property.operation === 'بيع' ? 'sold' : 'rented');
                    setShowConfirmStatusModal(true);
                  }}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl transition-colors text-sm border-2 border-green-600"
                >
                  {property.operation === 'بيع' ? 'علامة كـ (تم البيع ✅)' : 'علامة كـ (تم التأجير ✅)'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!isOwner && (property.status === 'active' || property.status === 'sold' || property.status === 'rented') && (
        <button onClick={() => setShowReportModal(true)} className="w-full text-xs text-gray-400 font-medium py-2 text-center hover:text-red-500 transition-colors">
          الإبلاغ عن هذا الإعلان
        </button>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-4 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}>
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4" dir="rtl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm">الإبلاغ عن الإعلان</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            {reportSent ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-green-600 text-sm">تم إرسال البلاغ بنجاح</p>
              </div>
            ) : (
              <>
                <textarea placeholder="اكتب سبب الإبلاغ..." value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl p-3 text-sm text-right resize-none h-24 focus:outline-none" />
                {reportError && <p className="text-red-500 text-xs">{reportError}</p>}
                <button onClick={handleReport} disabled={reportSending}
                  className="w-full bg-red-500 text-white font-bold text-sm py-3.5 rounded-2xl disabled:opacity-60">
                  {reportSending ? 'جاري الإرسال...' : 'إرسال البلاغ'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4" dir="rtl">
            <div className="text-5xl mb-2">🔒</div>
            <h3 className="font-black text-gray-800 text-lg">يجب تسجيل الدخول</h3>
            <p className="text-gray-500 text-sm">عذراً، يجب عليك تسجيل الدخول بحسابك لتتمكن من استخدام هذه الميزة.</p>
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={() => router.push('/login')} className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-colors">تسجيل الدخول / حساب جديد</button>
              <button onClick={() => setShowLoginModal(false)} className="w-full bg-gray-50 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-100 transition-colors">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Status Change Modal */}
      {showConfirmStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirmStatusModal(false); }}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl" dir="rtl">
            <div className="text-5xl mb-2">⚠️</div>
            <h3 className="font-black text-gray-800 text-lg">تأكيد تحويل الحالة</h3>
            <p className="text-gray-700 font-medium text-sm">
              هل أنت متأكد من تحويل حالة العقار إلى {pendingStatus === 'sold' ? '"مباع"' : '"مؤجر"'}؟
            </p>
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
              <p className="text-blue-800 text-xs font-bold leading-loose">
                (لا تنسَ مبلغ الدعم للتطبيق لنستمر، تواصل مع المسؤولين عبر الشات لإرسال المبلغ)
              </p>
            </div>
            
            <div className="pt-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleUpdateStatus(pendingStatus)}
                  className="flex-1 bg-green-500 text-white font-bold py-3 rounded-2xl hover:bg-green-600 transition-colors"
                >
                  نعم، متأكد
                </button>
                <button 
                  onClick={() => setShowConfirmStatusModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-2xl hover:bg-gray-200 transition-colors"
                >
                  لا، إلغاء
                </button>
              </div>
              <button 
                onClick={handleStartAdminChat}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition-colors mt-2"
              >
                💬 تواصل مع المسؤولين الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
