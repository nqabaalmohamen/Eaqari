// ============================================
// ملف الإعداد المركزي لرابط الخادم
// ============================================
// ملاحظة هامة جداً حسب إعداد المشروع:
//   - قاعدة البيانات والسيرفر (Backend) يعملان على جهاز المستخدم محلياً
//   - يتم تشغيل النظام إما عبر start_all.bat (Cloudflare Tunnel)
//     أو عبر start_production.bat (Ngrok الثابت أولاً + LocalTunnel ثانياً)
//   - لا يوجد خادم سحابي (Vercel/Railway) للـ Backend — أي محاولة للاتصال
//     بهم ستفشل ويجب تجاهلها تماماً.
// ============================================
// آلية الذكاء:
//   1) أولوية أولى: Ngrok الثابت (يشغله start_production فعلياً)
//   2) ثانياً: LocalTunnel الثابت
//   3) ثالثاً: الرابط المكتشف تلقائياً من start_all (Cloudflare) عبر قراءة
//      القيمة المخزنة مسبقاً في localStorage من سكريبت update_api_url.js
//   4) رابعاً: localhost:5000 للتطوير على نفس الجهاز الكمبيوتر فقط
// عند فشل أي رابط يتم محاولة الباقين فوراً مع timeout سريع.
// ============================================

// ⚠️ مهم جداً: Ngrok أولاً لأنه هو الوحيد الذي يشغله start_production.bat فعلياً
const PRODUCTION_FIXED_URLS = [
  'https://arming-diaper-stonework.ngrok-free.dev',
  'https://eaqari-api-prod-moh.loca.lt',
];

const LOCAL_DEV = 'http://localhost:5000';

const LEGACY_KEY = 'eaqari_api_base';
const CLOUDFLARE_KEY = 'eaqari_cloudflare_url';
const HEALTH_TIMEOUT_MS = 2500;
const REQUEST_TIMEOUT_MS = 15000;

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

function isProbablyAndroid(): boolean {
  try {
    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '').toLowerCase();
    return ua.includes('android') || ua.includes('capacitor');
  } catch {
    return false;
  }
}

function timeout<T>(p: Promise<T>, ms: number, label = 'timeout'): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(label)), ms)
    ),
  ]);
}

const DEFAULT_HEADERS: Record<string, string> = {
  'ngrok-skip-browser-warning': 'true',
  'Bypass-Tunnel-Reminder': 'true',
  'loca-skip-warning': 'true',
  Accept: 'application/json, text/plain, */*',
};

async function isHealthy(url: string): Promise<boolean> {
  try {
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller
      ? setTimeout(() => controller!.abort(), HEALTH_TIMEOUT_MS)
      : null;
    const res = await fetch(`${url}/api/health`, {
      method: 'GET',
      headers: DEFAULT_HEADERS as any,
      signal: controller ? controller.signal : undefined,
    } as any).catch(() => null as any);
    if (timer) clearTimeout(timer);
    return !!(res && res.ok);
  } catch {
    return false;
  }
}

function collectCandidates(): string[] {
  const savedLegacy = safeGet(LEGACY_KEY);
  const savedCf = safeGet(CLOUDFLARE_KEY);

  const list: string[] = [];

  if (savedCf && /^https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.test(savedCf)) {
    // Cloudflare محفوظ من الجلسة السابقة — يُفضَّل لأنه كان يعمل آخر مرة
    list.push(savedCf);
  }

  // روابط الإنتاج الثابتة (Ngrok أولاً لأنه يشغله start_production فعلياً)
  for (const u of PRODUCTION_FIXED_URLS) {
    if (!list.includes(u)) list.push(u);
  }

  if (
    savedLegacy &&
    /^https?:\/\//i.test(savedLegacy) &&
    !list.includes(savedLegacy)
  ) {
    list.push(savedLegacy);
  }

  // localhost للمتصفح على نفس الجهاز فقط — ولا نضيفه على Android لأنه لا يعني جهاز الكمبيوتر
  if (!isProbablyAndroid()) {
    if (!list.includes(LOCAL_DEV)) list.push(LOCAL_DEV);
  }

  return list.filter((v, i, a) => a.indexOf(v) === i);
}

async function resolveBase(force = false): Promise<string> {
  if (!force && cachedBase) return cachedBase;
  if (!force && resolving) return resolving;

  resolving = (async (): Promise<string> => {
    const candidates = collectCandidates();
    if (typeof console !== 'undefined') {
      console.info('[api.ts] 🧪 Testing candidate URLs:', candidates,
        'android=' + isProbablyAndroid());
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
    // إذا فشلت كل الفحوصات الصحية -> لا نخبّر رابط ميت في الكاش
    // ونعيد أول رابط إنتاج لكن نجرب الكل مرة أخرى في الطلب القادم
    cachedBase = null;
    const fallback = PRODUCTION_FIXED_URLS[0];
    if (typeof console !== 'undefined') {
      console.warn('[api.ts] ⚠️ No healthy base found; will fallback chain per request. First try:', fallback);
    }
    return fallback;
  })();

  try {
    return await resolving;
  } finally {
    resolving = null;
  }
}

// تبديل رابط معروف في URL بأساس بديل
function replaceBase(urlStr: string, newBase: string): string {
  const all = [...PRODUCTION_FIXED_URLS, LOCAL_DEV];
  const savedLegacy = safeGet(LEGACY_KEY);
  const savedCf = safeGet(CLOUDFLARE_KEY);
  if (savedLegacy) all.push(savedLegacy);
  if (savedCf) all.push(savedCf);
  for (const c of all) {
    if (!c) continue;
    if (urlStr.startsWith(c + '/') || urlStr === c) {
      return urlStr.replace(c, newBase);
    }
  }
  return urlStr;
}

// هل هذا الطلب متجه لأحد خوادمنا المحلية/النفقية؟
function isOurServer(urlStr: string): boolean {
  const all = [...PRODUCTION_FIXED_URLS, LOCAL_DEV];
  const savedLegacy = safeGet(LEGACY_KEY);
  const savedCf = safeGet(CLOUDFLARE_KEY);
  if (savedLegacy) all.push(savedLegacy);
  if (savedCf) all.push(savedCf);
  return all.some((c) => !!c && (urlStr.startsWith(c + '/') || urlStr === c));
}

function buildInit(orig: RequestInit | undefined): RequestInit {
  const headers: any = {
    ...DEFAULT_HEADERS,
    ...((orig && orig.headers) as any),
  };
  const out: RequestInit = { ...(orig || {}), headers };
  return out;
}

// ------- Global fetch patch -------
if (typeof window !== 'undefined' && !(window as any).__eaqariFetchPatchedV4) {
  const originalFetch = window.fetch.bind(window);
  (window as any).__eaqariFetchPatchedV4 = true;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const reqInit = buildInit(init);

    let url: string =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    const matchesKnown = isOurServer(url);

    if (matchesKnown) {
      if (!cachedBase) {
        try {
          await timeout(resolveBase(), HEALTH_TIMEOUT_MS + 500, 'resolveBase_slow')
            .catch(() => null as any);
        } catch {
          /* ignore */
        }
      }
      if (cachedBase) {
        url = replaceBase(url, cachedBase);
      }
    }

    const lastGoodBaseRef: { value: string | null } = { value: cachedBase };
    const tried: string[] = cachedBase ? [cachedBase] : [];

    let lastErr: any = null;

    const tryOne = async (candidateUrl: string, baseForLog: string): Promise<Response | null> => {
      try {
        const controller =
          typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller
          ? setTimeout(() => controller!.abort(), REQUEST_TIMEOUT_MS)
          : null;
        const mergedInit: RequestInit = {
          ...reqInit,
          signal: controller
            ? (controller.signal as any)
            : ((reqInit as any).signal || undefined),
        };
        const r = await originalFetch(candidateUrl, mergedInit);
        if (timer) clearTimeout(timer);

        if (!matchesKnown) return r;

        if (r.status === 404 || r.status === 502 || r.status === 503) {
          throw new Error('bad_status:' + r.status);
        }
        lastGoodBaseRef.value = baseForLog;
        return r;
      } catch (err: any) {
        lastErr = err;
        return null;
      }
    };

    // المحاولة الأولى (الرابط الحالي)
    const first = await tryOne(url, cachedBase || PRODUCTION_FIXED_URLS[0]);
    if (first) {
      if (matchesKnown && lastGoodBaseRef.value && !cachedBase) {
        cachedBase = lastGoodBaseRef.value;
        safeSet(LEGACY_KEY, cachedBase);
      }
      return first;
    }

    // Fallback: جرب كل الروابط المتبقية بالتسلسل
    if (matchesKnown) {
      const remaining = collectCandidates().filter((c) => !tried.includes(c));
      if (typeof console !== 'undefined') {
        console.warn('[api.ts] 🔄 Primary failed (' + url + '). Falling back to:', remaining);
      }
      for (const alt of remaining) {
        const altUrl = replaceBase(url, alt);
        const r = await tryOne(altUrl, alt);
        if (r) {
          cachedBase = alt;
          safeSet(LEGACY_KEY, alt);
          if (/\.trycloudflare\.com/i.test(alt)) safeSet(CLOUDFLARE_KEY, alt);
          if (typeof console !== 'undefined') {
            console.info('[api.ts] ✅ Fallback success via:', alt);
          }
          return r;
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

export const API_BASE: string = PRODUCTION_FIXED_URLS[0];
export const SERVER_URL: string = PRODUCTION_FIXED_URLS[0];
export const PRODUCTION_URLS: readonly string[] = PRODUCTION_FIXED_URLS;

// فحص أولي في الخلفية
if (typeof window !== 'undefined') {
  resolveBase().catch(() => {});
}
