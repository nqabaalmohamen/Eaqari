'use client';

import { API_BASE } from '@/utils/api';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSession, UserSession } from '@/utils/auth';
import { ALL_CENTERS_NAMES } from '@/utils/fayoumData';

export default function AddProperty() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'offer' | 'request'>('offer');

  // Form States - Offer
  const [offerTitle, setOfferTitle] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerType, setOfferType] = useState('شقة');
  const [offerOperation, setOfferOperation] = useState('بيع');
  const [offerArea, setOfferArea] = useState('');
  const [offerRooms, setOfferRooms] = useState('');
  const [offerBaths, setOfferBaths] = useState('');
  const [offerKitchens, setOfferKitchens] = useState('1');
  const [offerHalls, setOfferHalls] = useState('1');
  const [offerFloor, setOfferFloor] = useState('');
  const [hasPool, setHasPool] = useState(false);
  const [offerGovernorate, setOfferGovernorate] = useState('الفيوم');
  const [offerCity, setOfferCity] = useState('مدينة الفيوم');
  const [offerDescription, setOfferDescription] = useState('');
  const [offerAddress, setOfferAddress] = useState('');
  const [offerImages, setOfferImages] = useState<File[]>([]);
  const [offerImagePreviews, setOfferImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const searchParams = useSearchParams();

  // Utility Meters
  const [hasElectricity, setHasElectricity] = useState(false);
  const [electricityCount, setElectricityCount] = useState('1');
  const [electricityMeterType, setElectricityMeterType] = useState('قانوني');
  const [hasWater, setHasWater] = useState(false);
  const [waterCount, setWaterCount] = useState('1');
  const [hasGas, setHasGas] = useState(false);
  const [gasCount, setGasCount] = useState('1');
  const [isLicensed, setIsLicensed] = useState(false);

  // Form States - Request (Demand)
  const [requestTitle, setRequestTitle] = useState('');
  const [requestBudget, setRequestBudget] = useState('');
  const [requestType, setRequestType] = useState('شقة');
  const [requestOperation, setRequestOperation] = useState('شراء');
  const [requestArea, setRequestArea] = useState('');
  const [requestDescription, setRequestDescription] = useState('');

  const [message, setMessage] = useState('');

  useEffect(() => {
    const { user: currentSession } = getSession();
    if (!currentSession) {
      router.push('/login');
      setLoading(false);
      return;
    }
    setUser(currentSession);
    setActiveTab('offer');

    // Check if we're in edit mode
    const editParam = searchParams.get('edit');
    if (editParam) {
      const id = parseInt(editParam);
      setEditId(id);
      setIsEditMode(true);
      // Fetch existing property data to prefill form
      fetch(`${API_BASE}/api/properties/${id}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
        .then(r => r.json())
        .then(p => {
          setOfferTitle(p.description || '');
          setOfferPrice(p.price?.toString() || '');
          setOfferType(p.type || 'شقة');
          setOfferOperation(p.operation_type === 'sale' ? 'بيع' : 'إيجار');
          setOfferArea(p.area?.toString() || '');
          setOfferRooms(p.rooms?.toString() || '');
          setOfferBaths(p.bathrooms?.toString() || '');
          setOfferKitchens(p.features?.kitchens?.toString() || '1');
          setOfferHalls(p.features?.halls?.toString() || '1');
          setHasPool(p.features?.has_pool || false);
          setOfferGovernorate(p.governorate || 'الفيوم');
          setOfferCity(p.city || 'مدينة الفيوم');
          setOfferDescription(p.description || '');
          setOfferAddress(p.region || p.features?.other_features?.address || '');
          setOfferFloor((p.type === 'شقة' || p.type === 'مكتب') ? (p.floor?.toString() || '') : (p.type === 'منزل' ? (p.total_floors?.toString() || '') : ''));
          setHasElectricity(p.features?.has_electricity || false);
          setElectricityCount(p.features?.electricity_count?.toString() || '1');
          setElectricityMeterType(p.features?.electricity_meter_type || 'قانوني');
          setHasWater(p.features?.has_water || false);
          setWaterCount(p.features?.water_count?.toString() || '1');
          setHasGas(p.features?.has_gas || false);
          setGasCount(p.features?.gas_count?.toString() || '1');
          setIsLicensed(p.features?.is_licensed || false);
          if (p.media && p.media.length > 0) {
            setExistingImages(p.media.map((m: any) => m.media_url));
            setOfferImagePreviews(p.media.map((m: any) => m.media_url));
          }
        })
        .catch(console.error);
    }
    setLoading(false);
  }, [router, searchParams]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (offerImages.length + filesArray.length > 10) {
        alert('أقصى عدد للصور هو 10 صور فقط');
        return;
      }
      const newImages = [...offerImages, ...filesArray];
      setOfferImages(newImages);
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setOfferImagePreviews([...offerImagePreviews, ...newPreviews]);
    }
  };

  // Remove a NEW image (not yet uploaded)
  const removeImage = (index: number) => {
    const newIndex = index - existingImages.length; // offset by existing
    if (newIndex >= 0) {
      // It's a new image
      const updatedImages = offerImages.filter((_, i) => i !== newIndex);
      URL.revokeObjectURL(offerImagePreviews[index]);
      setOfferImages(updatedImages);
    } else {
      // It's an existing image - do nothing here, handled by removeExistingImage
    }
    const updatedPreviews = offerImagePreviews.filter((_, i) => i !== index);
    setOfferImagePreviews(updatedPreviews);
  };

  // Remove an EXISTING image (already uploaded to DB)
  const removeExistingImage = (index: number) => {
    const updatedExisting = existingImages.filter((_, i) => i !== index);
    setExistingImages(updatedExisting);
    // Also remove from previews (existing images come first)
    const updatedPreviews = offerImagePreviews.filter((_, i) => i !== index);
    setOfferImagePreviews(updatedPreviews);
  };

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // In edit mode, images are optional (existing ones are kept)
    if (!isEditMode && offerImages.length < 1) {
      alert('يجب إضافة صورة واحدة على الأقل للعقار (بحد أقصى 10 صور)');
      return;
    }
    setLoading(true);
    try {
      // Upload new images as base64 (with client-side compression)
      const imageUrls: string[] = [];
      for (const file of offerImages) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (ev) => {
            const img = new Image();
            img.src = ev.target?.result as string;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 800;
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              // Compress to JPEG with 0.7 quality
              const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
              imageUrls.push(dataUrl);
              resolve();
            };
            img.onerror = () => resolve();
          };
        });
      }

      const token = localStorage.getItem('eaqari_token');
      const payload = {
        owner_id: user.id,
        type: offerType,
        operation_type: offerOperation === 'بيع' ? 'sale' : 'rent',
        price: parseFloat(offerPrice.replace(/,/g, '')) || 0,
        area: parseFloat(offerArea) || 0,
        rooms: offerType === 'أرض' ? 0 : (parseInt(offerRooms) || 0),
        bathrooms: offerType === 'أرض' ? 0 : (parseInt(offerBaths) || 0),
        floor: (offerType === 'شقة' || offerType === 'مكتب') ? (parseInt(offerFloor) || null) : null,
        total_floors: offerType === 'منزل' ? (parseInt(offerFloor) || null) : null,
        description: offerDescription || offerTitle,
        governorate: offerGovernorate,
        city: offerCity,
        region: offerAddress,
        features: {
          has_electricity: hasElectricity,
          electricity_count: hasElectricity ? parseInt(electricityCount) || 1 : 0,
          electricity_meter_type: hasElectricity ? electricityMeterType : '',
          has_water: hasWater,
          water_count: hasWater ? parseInt(waterCount) || 1 : 0,
          has_gas: hasGas,
          gas_count: hasGas ? parseInt(gasCount) || 1 : 0,
          is_licensed: isLicensed,
          kitchens: (offerType === 'أرض' || offerType === 'محل') ? 0 : (parseInt(offerKitchens) || 1),
          halls: (offerType === 'شقة' || offerType === 'منزل' || offerType === 'فيلا') ? (parseInt(offerHalls) || 1) : 0,
          has_pool: offerType === 'فيلا' ? hasPool : false,
        },
        // If editing: keep existing images + add new ones. If new: use new images only.
        media: isEditMode
          ? [
              ...existingImages.map((url, i) => ({ media_url: url, media_type: 'image', is_primary: i === 0 })),
              ...imageUrls.map((url) => ({ media_url: url, media_type: 'image', is_primary: false })),
            ]
          : imageUrls.map((url, i) => ({ media_url: url, media_type: 'image', is_primary: i === 0 })),
      };

      const url = isEditMode
        ? `${API_BASE}/api/properties/${editId}`
        : `${API_BASE}/api/properties`;
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(isEditMode ? 'تم تعديل الإعلان بنجاح! 🎉' : 'تم إضافة عرض العقار الخاص بك بنجاح وجاري مراجعته من الإدارة! 🎉');
        setTimeout(() => router.push('/my-ads'), 2000);
      } else {

        setMessage(`❌ ${data.message || 'فشل إرسال العقار، حاول مرة أخرى'}`);
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setMessage(`❌ حدث خطأ في الاتصال بالخادم: ${err.message || 'حاول مرة أخرى'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('تم نشر طلب العقار الخاص بك بنجاح وسيتواصل معك الملاك مباشرة! 🎉');
    setTimeout(() => {
      router.push('/dashboard');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 font-bold">جاري التحميل...</p>
      </div>
    );
  }

  if (!user) return null;


  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-800">
          {isEditMode ? '✏️ تعديل الإعلان' : 'إضافة إعلان جديد'}
        </h2>
        <p className="text-xs text-gray-400">
          {isEditMode ? 'قم بتعديل بيانات إعلانك ثم احفظ التغييرات.' : 'انشر عرض عقار للبيع/الإيجار أو انشر طلباً للشراء/الإيجار بالفيوم.'}
        </p>
      </div>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-2xl text-center font-bold">
          {message}
        </div>
      )}

      {/* Tabs Selector */}
      {!isEditMode && (
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('offer')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'offer' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            ➕ إضافة عرض عقار (أملك عقاراً)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('request')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'request' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            🔍 إضافة طلب عقار (أبحث عن عقار)
          </button>
        </div>
      )}

      {activeTab === 'offer' ? (
        /* OFFER FORM */
        <form onSubmit={handleOfferSubmit} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">
            {isEditMode ? '✏️ تعديل بيانات العقار' : 'تفاصيل العقار المعروض'}
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">عنوان الإعلان</label>
              <input
                type="text"
                required
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="مثال: شقة للبيع في وسط البلد بالفيوم"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">
                {offerType === 'أرض' ? 'عنوان الأرض (الشارع / الحي)' : 'عنوان العقار بالتفصيل (الشارع / الحي)'}
              </label>
              <input
                type="text"
                value={offerAddress}
                onChange={(e) => setOfferAddress(e.target.value)}
                placeholder={offerType === 'أرض' ? 'مثال: شارع النصر، حي السلام' : 'مثال: شارع النصر، بجوار مسجد الرحمة، الدور الثاني'}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">السعر المطلوبة (ج.م)</label>
                <input
                  type="number"
                  required
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="مثال: 750000"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">المساحة (م²)</label>
                <input
                  type="number"
                  required
                  value={offerArea}
                  onChange={(e) => setOfferArea(e.target.value)}
                  placeholder="مثال: 120"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">نوع العملية</label>
                <select
                  value={offerOperation}
                  onChange={(e) => setOfferOperation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="بيع">عرض للبيع</option>
                  <option value="إيجار">عرض للإيجار</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">نوع العقار</label>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="شقة">شقة</option>
                  <option value="منزل">منزل</option>
                  <option value="فيلا">فيلا</option>
                  <option value="محل">محل</option>
                  <option value="أرض">أرض</option>
                  <option value="مكتب">مكتب</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">المحافظة</label>
                <select
                  value={offerGovernorate}
                  onChange={(e) => setOfferGovernorate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="الفيوم">الفيوم</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">المدينة / المركز</label>
                <select
                  value={offerCity}
                  onChange={(e) => setOfferCity(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_CENTERS_NAMES.map(center => (
                    <option key={center} value={center}>{center}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Fields by Property Type */}
            {offerType !== 'أرض' && (
              <div className="grid grid-cols-2 gap-3">
                {/* Rooms - not for shop */}
                {offerType !== 'محل' && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">الغرف</label>
                    <input type="number" value={offerRooms} onChange={(e) => setOfferRooms(e.target.value)} placeholder="3"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  </div>
                )}
                {/* Bathrooms - not for shop or land */}
                {offerType !== 'محل' && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">الحمامات</label>
                    <input type="number" value={offerBaths} onChange={(e) => setOfferBaths(e.target.value)} placeholder="2"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  </div>
                )}
                {/* Kitchen - not for shop or land */}
                {offerType !== 'محل' && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">المطابخ</label>
                    <input type="number" value={offerKitchens} onChange={(e) => setOfferKitchens(e.target.value)} placeholder="1" min="0"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  </div>
                )}
                {/* Halls - for apartment, house, villa only */}
                {(offerType === 'شقة' || offerType === 'منزل' || offerType === 'فيلا') && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">الصالات</label>
                    <input type="number" value={offerHalls} onChange={(e) => setOfferHalls(e.target.value)} placeholder="1" min="0"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  </div>
                )}
                {/* Floor - for apartment or office */}
                {(offerType === 'شقة' || offerType === 'مكتب') && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">الدور الكام</label>
                    <input type="number" value={offerFloor} onChange={(e) => setOfferFloor(e.target.value)} placeholder="مثال: 3"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  </div>
                )}
                {/* Total floors - for house */}
                {offerType === 'منزل' && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">المنزل كام دور</label>
                    <input type="number" value={offerFloor} onChange={(e) => setOfferFloor(e.target.value)} placeholder="مثال: 4"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                  </div>
                )}
              </div>
            )}

            {/* Pool for Villa */}
            {offerType === 'فيلا' && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                <button type="button" onClick={() => setHasPool(!hasPool)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${hasPool ? 'bg-blue-600 justify-end' : 'bg-gray-200 justify-start'}`}>
                  <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                </button>
                <span className="text-xs font-bold text-gray-700 flex-1">🏊‍♂️ يوجد حمام سباحة</span>
              </div>
            )}

            {/* License and Legal */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 block">الوضع القانوني</label>
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                <button type="button" onClick={() => setIsLicensed(!isLicensed)}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${isLicensed ? 'bg-green-500 justify-end' : 'bg-gray-200 justify-start'}`}>
                  <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                </button>
                <span className="text-xs font-bold text-gray-700 flex-1">العقار مرخص (أوراق رسمية)</span>
              </div>
            </div>

            {/* Utility Meters - hidden for land */}
            {offerType !== 'أرض' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 block">المرافق وعداداتها</label>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setHasElectricity(!hasElectricity)}
                        className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${hasElectricity ? 'bg-blue-600 justify-end' : 'bg-gray-200 justify-start'}`}>
                        <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                      </button>
                      <span className="text-xs font-bold text-gray-700 flex-1">⚡ عداد الكهرباء</span>
                      {hasElectricity && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400">العدد:</span>
                          <button type="button" onClick={() => setElectricityCount(c => Math.max(1,parseInt(c)-1).toString())} className="w-6 h-6 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center justify-center">−</button>
                          <span className="text-sm font-black text-gray-800 w-5 text-center">{electricityCount}</span>
                          <button type="button" onClick={() => setElectricityCount(c => Math.min(10,parseInt(c)+1).toString())} className="w-6 h-6 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center">+</button>
                        </div>
                      )}
                    </div>
                    {hasElectricity && (
                      <div className="flex gap-2 mt-1 mr-12 text-xs">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="meter_type" value="قانوني" checked={electricityMeterType === 'قانوني'} onChange={(e) => setElectricityMeterType(e.target.value)} />
                          <span>قانوني</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input type="radio" name="meter_type" value="كودي" checked={electricityMeterType === 'كودي'} onChange={(e) => setElectricityMeterType(e.target.value)} />
                          <span>كودي (ممارسة)</span>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
                    <button type="button" onClick={() => setHasWater(!hasWater)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${hasWater ? 'bg-blue-600 justify-end' : 'bg-gray-200 justify-start'}`}>
                      <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                    </button>
                    <span className="text-xs font-bold text-gray-700 flex-1">💧 عداد المياه</span>
                    {hasWater && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">العدد:</span>
                        <button type="button" onClick={() => setWaterCount(c => Math.max(1,parseInt(c)-1).toString())} className="w-6 h-6 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center justify-center">−</button>
                        <span className="text-sm font-black text-gray-800 w-5 text-center">{waterCount}</span>
                        <button type="button" onClick={() => setWaterCount(c => Math.min(10,parseInt(c)+1).toString())} className="w-6 h-6 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center">+</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
                    <button type="button" onClick={() => setHasGas(!hasGas)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center shrink-0 ${hasGas ? 'bg-blue-600 justify-end' : 'bg-gray-200 justify-start'}`}>
                      <span className="w-5 h-5 bg-white rounded-full shadow-sm mx-0.5" />
                    </button>
                    <span className="text-xs font-bold text-gray-700 flex-1">🔥 عداد الغاز</span>
                    {hasGas && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">العدد:</span>
                        <button type="button" onClick={() => setGasCount(c => Math.max(1,parseInt(c)-1).toString())} className="w-6 h-6 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold flex items-center justify-center">−</button>
                        <span className="text-sm font-black text-gray-800 w-5 text-center">{gasCount}</span>
                        <button type="button" onClick={() => setGasCount(c => Math.min(10,parseInt(c)+1).toString())} className="w-6 h-6 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description - hidden for land */}
            {offerType !== 'أرض' && (
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">الوصف والتشطيب</label>
                <textarea
                  required
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  placeholder="اكتب وصف العقار وتفاصيل التشطيب (سوبر لوكس، لوكس، نصف تشطيب، بدون تشطيب)..."
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right h-24"
                />
              </div>
            )}

            {/* Image Uploader */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 block mb-1">صور العقار (من 1 إلى 10 صور) *</label>
              
              <label htmlFor="offer-images" className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/10 transition-colors">
                <span className="text-2xl">📸</span>
                <span className="text-xs font-bold text-gray-700">اضغط لرفع الصور</span>
                <span className="text-[10px] text-gray-400">يمكنك تحديد حتى 10 صور للعقار</span>
              </label>
              <input
                id="offer-images"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              {offerImages.length > 0 && (
                <div className="text-[10px] text-gray-400 text-right">
                  عدد الصور المرفوعة: {offerImages.length} من 10
                </div>
              )}

              {offerImagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {offerImagePreviews.map((preview, index) => {
                    const isExisting = index < existingImages.length;
                    return (
                      <div key={preview + index} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
                        <img src={preview} alt="عقار" className="object-cover w-full h-full" />
                        {/* Existing image badge */}
                        {isExisting && (
                          <span className="absolute bottom-1 right-1 text-[8px] bg-blue-500 text-white px-1 rounded font-bold">محفوظة</span>
                        )}
                        <button
                          type="button"
                          onClick={() => isExisting ? removeExistingImage(index) : removeImage(index)}
                          className="absolute top-1 left-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/10"
          >
            {isEditMode ? '💾 حفظ التعديلات' : 'نشر عرض العقار الآن'}
          </button>
        </form>
      ) : (
        /* REQUEST FORM */
        <form onSubmit={handleRequestSubmit} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-800 border-b border-gray-100 pb-2">تفاصيل العقار المطلوب</h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">ما الذي تبحث عنه؟ (عنوان الطلب)</label>
              <input
                type="text"
                required
                value={requestTitle}
                onChange={(e) => setRequestTitle(e.target.value)}
                placeholder="مثال: مطلوب شقة للإيجار سنورس غرفتين"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">الميزانية التقريبية (ج.م)</label>
                <input
                  type="number"
                  required
                  value={requestBudget}
                  onChange={(e) => setRequestBudget(e.target.value)}
                  placeholder="مثال: 500000"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">المساحة المطلوبة (م²)</label>
                <input
                  type="number"
                  required
                  value={requestArea}
                  onChange={(e) => setRequestArea(e.target.value)}
                  placeholder="مثال: 100"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">نوع العملية المطلوبة</label>
                <select
                  value={requestOperation}
                  onChange={(e) => setRequestOperation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="شراء">طلب شراء</option>
                  <option value="إيجار">طلب إيجار</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">نوع العقار المطلوب</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="شقة">شقة</option>
                  <option value="منزل">منزل</option>
                  <option value="فيلا">فيلا</option>
                  <option value="محل">محل</option>
                  <option value="أرض">أرض</option>
                  <option value="مكتب">مكتب</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">تفاصيل ومواصفات الطلب</label>
              <textarea
                required
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder="اكتب أي متطلبات إضافية تود تواجدها في العقار المطلوب..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right h-24"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/10"
          >
            نشر طلب العقار الآن
          </button>
        </form>
      )}
    </div>
  );
}
