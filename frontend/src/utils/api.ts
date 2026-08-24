// ============================================
// ملف الإعداد المركزي لرابط الخادم
// آلية Fallback ذكية: تختبر الروابط بالترتيب وتستخدم أول رابط صالح
// يتم إصلاح رابط 404 تلقائياً عبر تبديل الرابط عند الفشل
// ============================================

const CANDIDATES = [
  // 1. LocalTunnel الثابت (مذكور في start_production.bat)
  'https://eaqari-api-prod-moh.loca.lt',
  // 2. Ngrok Static Tunnel
  'https://arming-diaper-stonework.ngrok-free.dev',
  // 3. Vercel (كما يرد في admin/error.tsx)
  'https://eaqari.vercel.app',
  // 4. Localhost للتطوير المحلي
  'http://localhost:5000',
];

const LS_KEY = 'eaqari_api_base';
const TIMEOUT_MS = 4000;

let cachedBase: string | null = null;
let resolving: Promise<string> | null = null;

function isAbsUrl(u: string): boolean {
  return /^https?:\/\//i.test(u);
}

function timeout(p: Promise<Response>, ms: number): Promise<Response> {
  return Promise.race([
    p,
    new Promise<Response>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
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
          'Accept': 'application/json',
        } as any,
      }),
      TIMEOUT_MS
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function resolveBase(force = false): Promise<string> {
  if (!force && cachedBase) return cachedBase;
  if (!force && resolving) return resolving;

  resolving = (async (): Promise<string> => {
    try {
      const saved =
        typeof window !== 'undefined' ? window.localStorage.getItem(LS_KEY) : null;
      const ordered =
        saved && !force
          ? [saved, ...CANDIDATES.filter((c) => c !== saved)]
          : [...CANDIDATES];

      for (const url of ordered) {
        if (await isHealthy(url)) {
          cachedBase = url;
          try {
            window.localStorage.setItem(LS_KEY, url);
          } catch {
            /* ignore */
          }
          if (typeof console !== 'undefined') {
            console.info('[api.ts] ✅ Selected API base:', url);
          }
          return url;
        } else if (typeof console !== 'undefined') {
          console.warn('[api.ts] ⚠️ Unreachable base:', url);
        }
      }
    } catch (e) {
      console.warn('[api.ts] resolveBase error:', e);
    }
    cachedBase = CANDIDATES[0];
    return cachedBase;
  })();

  try {
    return await resolving;
  } finally {
    resolving = null;
  }
}

function replaceBase(urlStr: string, newBase: string): string {
  for (const c of CANDIDATES) {
    if (urlStr.startsWith(c + '/') || urlStr === c) {
      return urlStr.replace(c, newBase);
    }
  }
  return urlStr;
}

// ------- Global fetch patch: headers + auto base swap -------
if (typeof window !== 'undefined' && !(window as any).__eaqariFetchPatchedV2) {
  const originalFetch = window.fetch.bind(window);

  (window as any).__eaqariFetchPatchedV2 = true;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const reqInit: RequestInit = init || {};
    reqInit.headers = {
      'ngrok-skip-browser-warning': 'true',
      'Bypass-Tunnel-Reminder': 'true',
      Accept: 'application/json, text/plain, */*',
      ...(reqInit.headers as any),
    } as any;

    let url: string =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;

    // إذا كان الطلب إلى أحد الروابط المعروفة ولم نعرف الرابط الصحيح بعد
    const urlMatchesKnown = CANDIDATES.some(
      (c) => url.startsWith(c + '/') || url === c
    );

    if (urlMatchesKnown) {
      // أول طلب فقط: إجراء فحص سريع قبل إرسال الطلب
      if (!cachedBase) {
        try {
          await resolveBase();
        } catch {
          /* ignore */
        }
      }
      if (cachedBase) {
        url = replaceBase(url, cachedBase);
      }
    }

    // إرسال الطلب الأول
    let lastErr: any = null;
    try {
      const r = await originalFetch(url, reqInit);
      // إذا كان الخطأ 404 أو 502 وما شابه والطلب متجه لرابط معروف، نحاول الروابط الأخرى
      if ((r.status === 404 || r.status === 502 || r.status === 503) && urlMatchesKnown) {
        throw new Error('bad_status:' + r.status);
      }
      return r;
    } catch (e: any) {
      lastErr = e;
    }

    // Fallback: جرب الروابط الأخرى واحدة تلو الأخرى
    if (urlMatchesKnown) {
      const alreadyTried = cachedBase ? [cachedBase] : [];
      const remaining = CANDIDATES.filter((c) => !alreadyTried.includes(c));
      for (const alt of remaining) {
        try {
          const altUrl = replaceBase(url, alt);
          if (typeof console !== 'undefined') {
            console.warn('[api.ts] 🔄 Retrying with fallback base:', alt);
          }
          const r = await originalFetch(altUrl, reqInit);
          if (r.ok || (r.status !== 404 && r.status !== 502 && r.status !== 503)) {
            cachedBase = alt;
            try {
              window.localStorage.setItem(LS_KEY, alt);
            } catch {
              /* ignore */
            }
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

// واجهات المستخدم
export function getCurrentApiBase(): string {
  return cachedBase || CANDIDATES[0];
}

export async function getApiBase(force = false): Promise<string> {
  return resolveBase(force);
}

// تصدير القيم الافتراضية (للتوافق مع الكود القديم)
// ملاحظة: القيمة قد تتغير في وقت التشغيل عبر آلية fallback داخل الـ fetch المعدل أعلاه
export const API_BASE: string = CANDIDATES[0];
export const SERVER_URL: string = CANDIDATES[0];
export const API_CANDIDATES: readonly string[] = CANDIDATES;

// تشغيل فحص أولي في الخلفية عند التحميل (للعميل فقط)
if (typeof window !== 'undefined') {
  resolveBase().catch(() => {});
}
