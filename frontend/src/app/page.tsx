'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { getSession, UserSession } from '@/utils/auth';
import { ALL_CENTERS_NAMES } from '@/utils/fayoumData';

// We will fetch properties from API instead of using mockProperties

const categories = [
  { name: 'الكل', icon: '🏢' },
  { name: 'شقق', icon: '🔑' },
  { name: 'منازل', icon: '🏠' },
  { name: 'فيلات', icon: '🏡' },
  { name: 'شاليهات', icon: '🏖️' },
  { name: 'محلات', icon: '🛒' },
  { name: 'أراضي', icon: '🌿' },
  { name: 'مولات', icon: '🏬' },
  { name: 'مكاتب', icon: '💼' },
];

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedCity, setSelectedCity] = useState('الكل');
  const [user, setUser] = useState<UserSession | null>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const { user: currentSession } = getSession();
    setUser(currentSession);
    setFavorites(JSON.parse(localStorage.getItem('eaqari_favorites') || '[]'));

    // Fetch properties
    const fetchProperties = async () => {
      try {
        const res = await fetch('https://eaqari.vercel.app/api/properties');
        if (res.ok) {
          const data = await res.json();
          // Transform backend data to match frontend structure
          const formatted = data.map((p: any) => ({
            id: p.id,
            title: p.description,
            type: p.type,
            operation: p.operation_type === 'sale' ? 'بيع' : 'إيجار',
            price: p.price.toLocaleString() + (p.operation_type === 'rent' ? ' ج.م / شهر' : ' ج.م'),
            area: p.area + 'م²',
            rooms: p.rooms,
            baths: p.bathrooms,
            location: p.region ? p.region + '، ' + p.city : p.city,
            city: p.city,
            image: p.media && p.media.length > 0 ? p.media[0].media_url : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
            verified: p.owner?.is_verified || false,
            owner: p.owner?.full_name || 'مستخدم غير معروف',
          }));
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

  let bannerBtnText = 'أضف إعلانك مجاناً';
  let bannerBtnPath = user ? '/add-property' : '/login';

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <input type="text" placeholder="ابحث في عقارات الفيوم..."
            className="w-full bg-white border border-gray-100 rounded-2xl py-3 px-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-gray-900" />
          <span className="absolute right-3 top-3.5 text-gray-400 text-base">🔍</span>
        </div>
        <Link href="/properties" className="bg-blue-600 text-white p-3 rounded-2xl shadow-md shadow-blue-500/20 flex items-center justify-center">
          <span>⚙️</span>
        </Link>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-[72%] space-y-2">
          <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            محافظة الفيوم
          </span>
          <h2 className="text-xl font-bold leading-tight">عقارك من المالك إليك مباشرة!</h2>
          <p className="text-xs text-blue-100">منصة عقاري تربطك بملاك العقارات في الفيوم بدون سماسرة أو عمولات.</p>
          <Link href={bannerBtnPath} className="inline-block mt-2 bg-white text-blue-600 font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-blue-50 transition-colors">
            {bannerBtnText}
          </Link>
        </div>
        <div className="absolute left-[-20px] bottom-[-20px] text-8xl opacity-15 rotate-12">🏠</div>
      </div>

      {/* Location Filter */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-800">المدينة / المركز</h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {['الكل', ...ALL_CENTERS_NAMES].map(city => (
            <button key={city} onClick={() => setSelectedCity(city)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap shadow-sm border transition-all ${
                selectedCity === city
                  ? 'bg-blue-600 text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}>
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-800">تصفح حسب النوع</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {categories.map(cat => (
            <button key={cat.name} onClick={() => setSelectedCategory(cat.name)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shadow-sm border transition-all ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
              }`}>
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Location indicator */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-800">أحدث عقارات الفيوم</h3>
        <Link href="/properties" className="text-xs font-bold text-blue-600">عرض الكل</Link>
      </div>

      {/* Property Cards */}
      <div className="space-y-4">
        {(() => {
          const getMappedCategory = (cat: string) => {
            switch (cat) {
              case 'شقق': return 'شقة';
              case 'منازل': return 'منزل';
              case 'فيلات': return 'فيلا';
              case 'شاليهات': return 'شاليه';
              case 'محلات': return 'محل';
              case 'أراضي': return 'أرض';
              case 'مولات': return 'مول';
              case 'مكاتب': return 'مكتب';
              default: return cat;
            }
          };

          const filteredProperties = properties.filter(prop => {
            const matchCategory = selectedCategory === 'الكل' || prop.type === getMappedCategory(selectedCategory);
            const matchCity = selectedCity === 'الكل' || prop.city === selectedCity;
            return matchCategory && matchCity;
          });

          if (loading) {
            return <div className="text-center py-10 text-gray-500 font-bold">جاري تحميل العقارات...</div>;
          }

          if (filteredProperties.length === 0) {
            return (
              <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-4xl block mb-2">🔍</span>
                <h4 className="font-bold text-gray-800 text-sm">لا توجد عقارات مطابقة</h4>
                <p className="text-xs text-gray-400 mt-1">جرب اختيار تصنيف آخر</p>
              </div>
            );
          }

          return filteredProperties.map(prop => (
            <Link href={`/properties/${prop.id}`} key={prop.id}
              className="block bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative h-48 w-full bg-gray-100">
                <img src={prop.image} alt={prop.title} className="object-cover w-full h-full" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className="bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    لل{prop.operation}
                  </span>
                  {prop.verified && (
                    <span className="bg-green-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      موثق ✓
                    </span>
                  )}
                </div>
                <button type="button" onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  const isFav = favorites.includes(prop.id);
                  const updated = isFav ? favorites.filter(id => id !== prop.id) : [...favorites, prop.id];
                  setFavorites(updated);
                  localStorage.setItem('eaqari_favorites', JSON.stringify(updated));
                }}
                  className={`absolute bottom-3 left-3 backdrop-blur-sm p-2 rounded-full shadow-sm transition-all ${
                    favorites.includes(prop.id) ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-500'
                  }`}>
                  {favorites.includes(prop.id) ? '❤' : '🤍'}
                </button>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-sm text-gray-800 line-clamp-1 flex-1">{prop.title}</h4>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">{prop.type}</span>
                </div>
                <p className="text-blue-600 font-extrabold text-base">{prop.price}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1">📍 {prop.location}</p>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-xs text-gray-500 font-medium">
                  <div className="flex gap-3">
                    <span>🔲 {prop.area}</span>
                    {prop.rooms > 0 && <><span>🛏️ {prop.rooms}</span><span>🛁 {prop.baths}</span></>}
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 bg-gray-50 px-2.5 py-1 rounded-xl">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="font-bold text-[10px]">المالك: {prop.owner}</span>
                  </div>
                </div>
              </div>
            </Link>
          ));
        })()}
      </div>
    </div>
  );
}
