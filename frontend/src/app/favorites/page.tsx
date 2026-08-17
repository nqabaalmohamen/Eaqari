'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface FavProperty {
  id: number;
  title: string;
  type: string;
  operation: string;
  price: string;
  location: string;
  image: string;
  verified?: boolean;
  owner?: string;
  area?: string;
  rooms?: number;
  baths?: number;
  status?: string;
}

export default function Favorites() {
  const router = useRouter();
  const [favIds, setFavIds] = useState<number[]>([]);
  const [properties, setProperties] = useState<FavProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const stored: number[] = JSON.parse(localStorage.getItem('eaqari_favorites') || '[]');
    setFavIds(stored);

    if (stored.length === 0) {
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const res = await fetch('https://eaqari.vercel.app/api/properties');
        if (res.ok) {
          const allProps = await res.json();
          const favPropsData: FavProperty[] = allProps
            .filter((p: any) => stored.includes(p.id))
            .map((p: any) => ({
              id: p.id,
              title: p.description || (p.type + ' لل' + (p.operation_type === 'sale' ? 'بيع' : 'إيجار')),
              type: p.type,
              operation: p.operation_type === 'sale' ? 'بيع' : 'إيجار',
              price: p.price?.toLocaleString('ar-EG') + (p.operation_type === 'rent' ? ' ج.م / شهر' : ' ج.م'),
              location: p.region ? p.region + '، ' + p.city : p.city,
              image: p.media && p.media.length > 0
                ? p.media[0].media_url
                : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
              verified: p.owner?.is_verified || false,
              owner: p.owner?.full_name || 'مالك غير معروف',
              area: p.area + 'م²',
              rooms: p.rooms || 0,
              baths: p.bathrooms || 0,
              status: p.status
            }));
          setProperties(favPropsData);
        }
      } catch (err) {
        console.error('Error fetching favorite properties:', err);
        setMessage('تعذر تحميل العقارات المفضلة');
        setTimeout(() => setMessage(''), 3000);
      } finally {
        setLoading(false);
      }
    };
    fetchFavorites();
  }, []);

  const removeFavorite = (id: number) => {
    const stored: number[] = JSON.parse(localStorage.getItem('eaqari_favorites') || '[]');
    const updated = stored.filter(fid => fid !== id);
    localStorage.setItem('eaqari_favorites', JSON.stringify(updated));
    setFavIds(updated);
    setProperties(properties.filter(p => p.id !== id));
    setMessage('تمت الإزالة من المفضلة');
    setTimeout(() => setMessage(''), 2000);
  };

  const clearAllFavorites = () => {
    if (!confirm('هل تريد مسح جميع العقارات من المفضلة؟')) return;
    localStorage.setItem('eaqari_favorites', JSON.stringify([]));
    setFavIds([]);
    setProperties([]);
    setMessage('تم مسح جميع المفضلة');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
            >
              رجوع
            </button>
            <h1 className="text-lg font-black text-gray-800">المفضلة ❤️</h1>
          </div>
          {properties.length > 0 && (
            <button
              type="button"
              onClick={clearAllFavorites}
              className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
            >
              مسح الكل
            </button>
          )}
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-4 py-2.5 rounded-xl text-center">
            {message}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-bold">جاري تحميل المفضلة...</p>
          </div>
        ) : favIds.length === 0 || properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <span className="text-6xl">🤍</span>
            <p className="text-gray-500 font-bold text-sm text-center">لا توجد عقارات في المفضلة بعد</p>
            <p className="text-gray-400 text-xs text-center">
              اضغط على زر ❤️ في أي عقار لإضافته هنا
            </p>
            {favIds.length > 0 && properties.length === 0 && (
              <p className="text-amber-600 text-xs text-center bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
                ملاحظة: بعض العقارات المضافة سابقاً لم تعد متوفرة حالياً
              </p>
            )}
            <Link
              href="/"
              className="bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              تصفح العقارات
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium">{properties.length} عقار محفوظ</p>
              <Link
                href="/properties"
                className="text-xs font-bold text-blue-600"
              >
                استكشف المزيد
              </Link>
            </div>
            {properties.map(prop => (
              <div
                key={prop.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex gap-3 p-3 hover:shadow-md transition-shadow"
              >
                <Link
                  href={`/properties/${prop.id}`}
                  className="shrink-0"
                  prefetch={false}
                >
                  <img
                    src={prop.image}
                    alt={prop.title}
                    className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200';
                    }}
                  />
                </Link>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <Link href={`/properties/${prop.id}`} prefetch={false}>
                      <h3 className="font-bold text-sm text-gray-800 leading-tight line-clamp-2 hover:text-blue-600 transition-colors">
                        {prop.title}
                      </h3>
                    </Link>
                    <p className="text-blue-600 font-black text-sm mt-1">{prop.price}</p>
                    <p className="text-gray-400 text-[10px] mt-0.5 truncate">📍 {prop.location}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">
                        لل{prop.operation}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 font-medium px-2 py-0.5 rounded-full">
                        {prop.type}
                      </span>
                      {prop.verified && (
                        <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-full">
                          موثق ✓
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFavorite(prop.id)}
                      className="shrink-0 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors self-end"
                      title="إزالة من المفضلة"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
