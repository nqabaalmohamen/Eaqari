export const GOVERNORATE_NAME = 'محافظة الفيوم';

export interface FayoumCenter {
  name: string;
  nameAr: string;
  type: 'مدينة' | 'مركز';
  districts?: string[];
}

export const FAYOUM_CENTERS: FayoumCenter[] = [
  {
    name: 'Madinat Fayoum',
    nameAr: 'مدينة الفيوم',
    type: 'مدينة',
    districts: [
      'وسط البلد',
      'المنتشية',
      'حي الأزهري',
      'حي النصر',
      'حي الزهور',
      'حي السلام',
      'الشرفية',
      'العوامية',
      'الكردانة',
      'المصيف',
      'القرية الذكية',
      'الفيوم الجديدة'
    ]
  },
  {
    name: 'Markaz Fayoum',
    nameAr: 'مركز الفيوم',
    type: 'مركز',
    districts: [
      'قرية الفيوم',
      'السواقة',
      'الحامد',
      'أبو الغيث',
      'العامرية',
      'المحطة',
      'كفر عابد',
      'برج الأديب',
      'المطرية',
      'الشجرة'
    ]
  },
  {
    name: 'Sanuris',
    nameAr: 'سنورس',
    type: 'مركز',
    districts: [
      'مدينة سنورس',
      'أبو شوشة',
      'الخطاطبة',
      'برج الحجر',
      'كفر عبدلله',
      'أبو رديس',
      'الجندوبة',
      'باني هشام',
      'النزلة',
      'منشأة سنورس'
    ]
  },
  {
    name: 'Etsa',
    nameAr: 'إطسا',
    type: 'مركز',
    districts: [
      'مدينة إطسا',
      'القرية الكبرى',
      'كفر سعد',
      'المعصرة',
      'بستان الكتخدا',
      'أبو زيد',
      'العقلة الصغيرة',
      'المنشأة',
      'شندويل',
      'بطلوقس'
    ]
  },
  {
    name: 'Tamiya',
    nameAr: 'طامية',
    type: 'مركز',
    districts: [
      'مدينة طامية',
      'الصفحة',
      'رحلة',
      'بني عطا الله',
      'النخلة',
      'كفر يوسف',
      'أبو النصر',
      'المقاطعة',
      'البرج الجديد',
      'منشأة أبو الخير'
    ]
  },
  {
    name: 'Ibshway',
    nameAr: 'إبشواي',
    type: 'مركز',
    districts: [
      'مدينة إبشواي',
      'العباسية',
      'الغربية',
      'كفر زيدان',
      'بني سميع',
      'أبو رمان',
      'الصفرية',
      'برامون',
      'المنصورة الصغرى',
      'أبو النار'
    ]
  },
  {
    name: 'Youssef El Seddik',
    nameAr: 'يوسف الصديق',
    type: 'مركز',
    districts: [
      'مدينة يوسف الصديق',
      'عزبة النخل',
      'الحريزات',
      'كفر شبل',
      'بني حمدان',
      'المسليمة',
      'الغنامية',
      'أبو عصبة',
      'الزرقا',
      'المؤتية'
    ]
  },
  {
    name: 'New Fayoum',
    nameAr: 'الفيوم الجديدة',
    type: 'مدينة',
    districts: [
      'الحي الأول',
      'الحي الثاني',
      'الحي الثالث',
      'الحي الرابع',
      'المنطقة الصناعية',
      'المنطقة الخدمية',
      'مشروع السكن المجاني',
      'مشروع ضاحية الأمل'
    ]
  }
];

export const ALL_CENTERS_NAMES: string[] = FAYOUM_CENTERS.map(c => c.nameAr);

export const PROPERTY_TYPES: { name: string; icon: string }[] = [
  { name: 'شقة', icon: '🔑' },
  { name: 'منزل', icon: '🏠' },
  { name: 'فيلا', icon: '🏡' },
  { name: 'شاليه', icon: '🏖️' },
  { name: 'محل', icon: '🛒' },
  { name: 'أرض', icon: '🌿' },
  { name: 'مول', icon: '🏬' },
  { name: 'مكتب', icon: '💼' }
];

export const ROOMS_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const BATHROOMS_OPTIONS = [0, 1, 2, 3, 4, 5];
export const FLOOR_OPTIONS = [
  'أرضي',
  'أول',
  'ثاني',
  'ثالث',
  'رابع',
  'خامس',
  'سادس',
  'سابع',
  'ثامن',
  'تاسع',
  'عاشر',
  'أعلى من عشر',
  'قبو',
  'دوبلكس',
  'بتهو'
];

export const FINISHING_OPTIONS = [
  'غير محدد',
  'شبه متشطب',
  'متشطب',
  'فاخر',
  'سوبر لوكس',
  'أفندي',
  'قديم',
  'تحت الإنشاء'
];

export const getDistrictsForCenter = (centerNameAr: string): string[] => {
  const center = FAYOUM_CENTERS.find(c => c.nameAr === centerNameAr);
  return center?.districts || [];
};
