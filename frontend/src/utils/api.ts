// ============================================
// ملف الإعداد المركزي لرابط الخادم
// تم تثبيت هذا الرابط ليعمل مع النفق الدائم الجديد (LocalTunnel)
// ============================================

const STATIC_TUNNEL_URL = 'https://arming-diaper-stonework.ngrok-free.dev';

// رابط الخادم الأساسي (بدون /api - يضاف `/api` في كل استدعاء)
export const API_BASE = STATIC_TUNNEL_URL;

// رابط الخادم الأساسي (بدون /api)
export const SERVER_URL = STATIC_TUNNEL_URL;