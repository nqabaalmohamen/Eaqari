'use client';

import { API_BASE } from '@/utils/api';
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FAYOUM_CENTERS } from '@/utils/fayoumData';

export default function Properties() {
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('الكل');
  const [operation, setOperation] = useState('الكل');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [loading, setLoading] = useState(true);

  const citiesList = ['الكل', ...FAYOUM_CENTERS.map(c => c.nameAr)];

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/properties`);
        if (res.ok) {
          const data = await res.json();
          const formatted = data
            .filter((p: any) => ['active', 'sold', 'rented'].includes(p.status))
            .map((p: any) => ({
              id: p.id,
              title: p.description,
              type: p.type,
              operation: p.operation_type === 'sale' ? 'بيع' : 'إيجار',
              price: p.price,
              area: p.area,
              rooms: p.rooms || 0,
              baths: p.bathrooms || 0,
              location: p.region ? p.region + '، ' + p.city : p.city,
              district: p.city,
              city: p.city,
              region: p.region,
              image: p.media && p.media.length > 0
                ? p.media[0].media_url
                : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
              verified: p.owner?.is_verified || false,
              owner: p.owner?.full_name || 'مستخدم غير معروف',
              is_featured: p.is_featured || false,
              status: p.status
            }));
          setAllProperties(formatted);
          setProperties(formatted);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  useEffect(() => {
    let filtered = allProperties;
    const term = search.trim().toLowerCase();

    if (term) {
      filtered = filtered.filter(p =>
        (p.title || '').toLowerCase().includes(term) ||
        (p.location || '').toLowerCase().includes(term) ||
        (p.district || '').toLowerCase().includes(term) ||
        (p.region || '').toLowerCase().includes(term)
      );
    }
    if (type !== 'الكل') {
      filtered = filtered.filter(p => p.type === type);
    }
    if (operation !== 'الكل') {
      filtered = filtered.filter(p => p.operation === operation);
    }
    if (maxPrice) {
      const maxP = parseInt(maxPrice);
      if (!isNaN(maxP)) {
        filtered = filtered.filter(p => Number(p.price) <= maxP);
      }
    }
    if (selectedCity !== 'الكل') {
      filtered = filtered.filter(p =>
        p.city === selectedCity || p.district === selectedCity
      );
    }

    setProperties(filtered);
  }, [search, type, operation, maxPrice, selectedCity, allProperties]);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-gray-800">البحث في عقارات الفيوم</h2>
        <p className="text-xs text-gray-400 mt-0.5">اعثر على عقارك في محافظة الفيوم بدون وسيط.</p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 flex items-center gap-2">
        <span className="text-blue-600 font-black text-sm">📍 محافظة الفيوم</span>
        <span className="text-blue-400 text-xs">— المنصة تعمل حصرياً في الفيوم</span>
      </div>

      {/* City / Center Filter */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-500 block">المدينة / المركز</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {citiesList.map(city => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm border transition-all ${
                selectedCity === city
                  ? 'bg-blue-600 text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Box */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">ابحث بالاسم أو المنطقة</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="مثال: مدينة الفيوم، سنورس، شقة..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">نوع العقار</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="الكل">الكل</option>
              <option value="شقة">شقة</option>
              <option value="منزل">منزل</option>
              <option value="فيلا">فيلا</option>
              <option value="شاليه">شاليه</option>
              <option value="محل">محل</option>
              <option value="أرض">أرض</option>
              <option value="مول">مول</option>
              <option value="مكتب">مكتب</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">نوع العملية</label>
            <select
              value={operation}
              onChange={e => setOperation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="الكل">الكل</option>
              <option value="بيع">للبيع</option>
              <option value="إيجار">للإيجار</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">الحد الأقصى للسعر (ج.م)</label>
          <input
            type="number"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            placeholder="السعر الأقصى"
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-[10px] text-gray-400 font-medium">
            تم جلب {allProperties.length} عقار • {properties.length} مطابقة
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setType('الكل');
              setOperation('الكل');
              setMaxPrice('');
              setSelectedCity('الكل');
            }}
            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            مسح الفلاتر
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-800">العقارات المطابقة ({properties.length})</h3>
        {loading ? (
          <div className="text-center py-10 text-gray-500 font-bold">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            جاري تحميل العقارات...
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <span className="text-5xl block mb-3">🔍</span>
            <h4 className="font-bold text-gray-800 text-lg">لا توجد عقارات مطابقة لنتائج البحث</h4>
            <p className="text-sm text-gray-400 mt-2">جرب تغيير شروط البحث أو إزالة بعض الفلاتر.</p>
            <button
              type="button"
              onClick={() => {
                setSearch(''); setType('الكل'); setOperation('الكل'); setMaxPrice(''); setSelectedCity('الكل');
              }}
              className="mt-4 bg-blue-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
            >
              عرض جميع العقارات
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map(prop => (
              <Link
                href={`/properties/${prop.id}`}
                key={prop.id}
                prefetch={false}
                className="block bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 w-full bg-gray-100">
                  <img
                    src={prop.image}
                    alt={prop.title}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600';
                    }}
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      لل{prop.operation}
                    </span>
                    {prop.verified && (
                      <span className="bg-green-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                        موثق ✓
                      </span>
                    )}
                    {prop.is_featured && (
                      <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        ⭐ مميز
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-sm text-gray-800 line-clamp-1 flex-1">{prop.title}</h4>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{prop.type}</span>
                  </div>
                  <p className="text-blue-600 font-extrabold text-base">
                    {Number(prop.price).toLocaleString('ar-EG')} ج.م {prop.operation === 'إيجار' ? '/ شهر' : ''}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">📍 {prop.location}</p>
                  <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs text-gray-500 font-medium">
                    <div className="flex gap-3">
                      <span>🔲 {prop.area}م²</span>
                      {Number(prop.rooms) > 0 && (
                        <>
                          <span>🛏️ {prop.rooms}</span>
                          <span>🛁 {prop.baths}</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-lg">
                      المالك: {prop.owner}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
