// ============================================
// ملف الإعداد المركزي لرابط الخادم
// ============================================
// ملاحظة هامة جداً حسب إعداد المشروع:
//   - قاعدة البيانات والسيرفر (Backend) يعملان على جهاز المستخدم محلياً
//   - يتم تشغيل النظام إما عبر start_all.bat (Cloudflare Tunnel)
//     أو عبر start_production.bat (Ngrok الثابت + LocalTunnel الثابت)
//   - لا يوجد خادم سحابي (Vercel/Railway) للـ Backend — أي محاولة للاتصال
//     بهم ستفشل ويجب تجاهلها تماماً.
// ============================================
// آلية الذكاء:
//   1) أولوية أولى: الروابط الثابتة في start_production (Ngrok + LocalTunnel)
//   2) ثانياً: الرابط المكتشف تلقائياً من start_all (Cloudflare) عبر قراءة
//      القيمة المخزنة مسبقاً في localStorage من سكريبت update_api_url.js
//   3) ثالثاً: localhost:5000 للتطوير على نفس الجهاز
// عند فشل أي رابط (404/502/timeout) يتم محاولة الباقين تلقائياً.
// ============================================

const PRODUCTION_FIXED_URLS = [
  'https://eaqari-api-prod-moh.loca.lt',
  'https://arming-diaper-stonework.ngrok-free.dev',
];

const LOCAL_DEV = 'http://localhost:5000';

const LEGACY_KEY = 'eaqari_api_base';
const CLOUDFLARE_KEY = 'eaqari_cloudflare_url';
const TIMEOUT_MS = 4500;

let cachedBase: string | null = null;
let resolving: Promise<string> | null = null;

function safeGet(k: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k: string, v: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

function timeout(p: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([
    p,
    new Promise<Response>((_, rej) =>
      setTimeout(() => rej(new Error('timeout')), ms)
    ),
  ]);
}

async function isHealthy(url: string): Promise<boolean> {
  try {
    const res = await timeout(
      fetch(`${url}/api/health`, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true',
          Accept: 'application/json',
        } as any,
      }),
      TIMEOUT_MS
    );
    return res.ok;
  } catch {
    return false;
  }
}

// يجمع كل الروابط المرشحة بالترتيب الصحيح (بدون روابط سحابية)
function collectCandidates(): string[] {
  const savedLegacy = safeGet(LEGACY_KEY);
  const savedCf = safeGet(CLOUDFLARE_KEY);

  const list: string[] = [...PRODUCTION_FIXED_URLS];

  if (savedCf && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.test(savedCf)) {
    if (!list.includes(savedCf)) list.push(savedCf);
  }
  if (
    savedLegacy &&
    /^https?:\/\//i.test(savedLegacy) &&
    !list.includes(savedLegacy)
  ) {
    list.push(savedLegacy);
  }
  list.push(LOCAL_DEV);

  // إزالة التكرارات مع الحفاظ على الترتيب
  return list.filter((v, i, a) => a.indexOf(v) === i);
}

async function resolveBase(force = false): Promise<string> {
  if (!force && cachedBase) return cachedBase;
  if (!force && resolving) return resolving;

  resolving = (async (): Promise<string> => {
    const candidates = collectCandidates();
    if (typeof console !== 'undefined') {
      console.info('[api.ts] 🧪 Testing candidate URLs (local/tunnel only):', candidates);
    }
    for (const url of candidates) {
      if (await isHealthy(url)) {
        cachedBase = url;
        safeSet(LEGACY_KEY, url);
        if (/\.trycloudflare\.com/i.test(url)) safeSet(CLOUDFLARE_KEY, url);
        if (typeof console !== 'undefined') {
          console.info('[api.ts] ✅ Selected API base:', url);
        }
        return url;
      } else if (typeof console !== 'undefined') {
        console.warn('[api.ts] ⚠️ Unreachable base:', url);
      }
    }
    // إذا فشل الكل، نستخدم أول رابط ثابت كافتراضي حتى يظهر للمستخدم خطأ واضح
    cachedBase = PRODUCTION_FIXED_URLS[0];
    return cachedBase;
  })();

  try {
    return await resolving;
  } finally {
    resolving = null;
  }
}

// تبديل رابط معروف في URL بأساس بديل
function replaceBase(urlStr: string, newBase: string): string {
  const all = collectCandidates();
  for (const c of all) {
    if (urlStr.startsWith(c + '/') || urlStr === c) {
      return urlStr.replace(c, newBase);
    }
  }
  return urlStr;
}

// هل هذا الطلب متجه لأحد خوادمنا المحلية/النفقية؟
function isOurServer(urlStr: string): boolean {
  const all = collectCandidates();
  return all.some((c) => urlStr.startsWith(c + '/') || urlStr === c);
}

// ------- Global fetch patch -------
if (typeof window !== 'undefined' && !(window as any).__eaqariFetchPatchedV3) {
  const originalFetch = window.fetch.bind(window);
  (window as any).__eaqariFetchPatchedV3 = true;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const reqInit: RequestInit = init || {};
    reqInit.headers = {
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      'loca-skip-warning': 'true',
      Accept: 'application/json, text/plain, */*',
      ...(reqInit.headers as any),
    } as any;

    let url: string =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    const matchesKnown = isOurServer(url);

    // أول طلب: نتأكد من وجود رابط صالح قبل الإرسال
    if (matchesKnown && !cachedBase) {
      try {
        await resolveBase();
      } catch {
        /* ignore */
      }
    }
    if (matchesKnown && cachedBase) {
      url = replaceBase(url, cachedBase);
    }

    // إرسال الطلب الأول
    let lastErr: any = null;
    try {
      const r = await originalFetch(url, reqInit);
      if (
        matchesKnown &&
        (r.status === 404 || r.status === 502 || r.status === 503)
      ) {
        // الرابط الحالي ميت -> نحاول باقي الروابط المحلية/النفقية فقط
        throw new Error('bad_status:' + r.status);
      }
      return r;
    } catch (e: any) {
      lastErr = e;
    }

    // Fallback: جرب الروابط المتبقية
    if (matchesKnown) {
      const tried = cachedBase ? [cachedBase] : [];
      const remaining = collectCandidates().filter((c) => !tried.includes(c));
      for (const alt of remaining) {
        try {
          const altUrl = replaceBase(url, alt);
          if (typeof console !== 'undefined') {
            console.warn('[api.ts] 🔄 Fallback retry with:', alt);
          }
          const r = await originalFetch(altUrl, reqInit);
          // لا نعتبر 404/502 نجاحاً هنا أيضاً
          if (r.status !== 404 && r.status !== 502 && r.status !== 503) {
            cachedBase = alt;
            safeSet(LEGACY_KEY, alt);
            if (/\.trycloudflare\.com/i.test(alt)) safeSet(CLOUDFLARE_KEY, alt);
            return r;
          }
        } catch (err) {
          lastErr = err;
        }
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error(String(lastErr) || 'Network error');
  };
}

// ------- واجهات برمجية -------
export function getCurrentApiBase(): string {
  return cachedBase || PRODUCTION_FIXED_URLS[0];
}
export async function getApiBase(force = false): Promise<string> {
  return resolveBase(force);
}

// تصدير القيم الافتراضية (للتوافق مع الكود القديم)
// ملاحظة: القيمة الفعلية المستخدمة وقت التشغيل هي التي يتم اختيارها
// عبر آلية resolveBase أعلاه ويتم تحديثها تلقائياً داخل fetch المعدل
export const API_BASE: string = PRODUCTION_FIXED_URLS[0];
export const SERVER_URL: string = PRODUCTION_FIXED_URLS[0];
export const PRODUCTION_URLS: readonly string[] = PRODUCTION_FIXED_URLS;

// فحص أولي في الخلفية
if (typeof window !== 'undefined') {
  resolveBase().catch(() => {});
}
