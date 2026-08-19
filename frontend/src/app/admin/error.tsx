'use client';

'use client';

import { useEffect } from 'react';

export default function AdminPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      console.error('[ADMIN PAGE ERROR BOUNDARY CAUGHT]:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        digest: error?.digest,
        cause: (error as any)?.cause,
      });
    } catch {
      /* ignore */
    }
  }, [error]);

  const errorMessage = error?.message || 'حدث خطأ غير معروف أثناء تحميل لوحة التحكم';
  const errorName = error?.name || 'AdminError';
  const errorStack = error?.stack || '';

  const likelyCauses: string[] = [];
  const msgLc = (errorMessage || '').toLowerCase();
  if (msgLc.includes('fetch') || msgLc.includes('network') || msgLc.includes('networkerror') || msgLc.includes('timeout')) {
    likelyCauses.push('📡 مشكلة في الاتصال بخادم الـ APIs (eaqari.vercel.app)');
  }
  if (msgLc.includes('json') || msgLc.includes('parse') || msgLc.includes('unexpected')) {
    likelyCauses.push('📦 استجابة غير صالحة من الـ API (ربما صفحة HTML بدلاً من JSON)');
  }
  if (msgLc.includes('localstorage') || msgLc.includes('storage') || msgLc.includes('permission')) {
    likelyCauses.push('🔐 مشكلة في الوصول للتخزين المحلي (جرب وضع التصفح العادي)');
  }
  if (msgLc.includes('auth') || msgLc.includes('session') || msgLc.includes('token') || msgLc.includes('login')) {
    likelyCauses.push('🔑 الجلسة غير صالحة أو انتهت صلاحيتها');
  }
  if (likelyCauses.length === 0) {
    likelyCauses.push('💾 ربما تحتاج لتحديث الصفحة أو إعادة تسجيل الدخول');
  }

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 620,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 20,
        padding: 28,
        border: '1px solid rgba(239, 68, 68, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>🔧</div>
          <h1 style={{
            color: '#fca5a5',
            margin: '0 0 8px 0',
            fontSize: 24,
            fontWeight: 900,
          }}>
            تعذر تحميل لوحة تحكم الأدمن
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: 14, margin: 0 }}>
            تم اكتشاف خطأ أثناء تشغيل الصفحة. الأسباب المحتملة:
          </p>
        </div>

        <div style={{
          background: 'rgba(251, 146, 60, 0.08)',
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
          border: '1px solid rgba(251, 146, 60, 0.2)',
        }}>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {likelyCauses.map((c, i) => (
              <li key={i} style={{
                fontSize: 13,
                color: '#fdba74',
                fontWeight: 600,
                lineHeight: 1.5,
              }}>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}>
          <div style={{
            color: '#f87171',
            fontWeight: 'bold',
            fontSize: 13,
            marginBottom: 8,
            fontFamily: 'Consolas, monospace',
          }}>
            ❯ {errorName}
          </div>
          <div style={{
            color: '#fecaca',
            fontSize: 14,
            lineHeight: 1.6,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}>
            {errorMessage}
          </div>
        </div>

        {errorStack && (
          <details style={{ marginBottom: 20 }}>
            <summary style={{
              cursor: 'pointer',
              color: '#a78bfa',
              fontSize: 13,
              padding: '10px 14px',
              background: 'rgba(139, 92, 246, 0.1)',
              borderRadius: 10,
              border: '1px solid rgba(139, 92, 246, 0.2)',
            }}>
              📋 عرض التفاصيل التقنية (للمطور)
            </summary>
            <pre style={{
              background: 'rgba(0, 0, 0, 0.7)',
              color: '#d1d5db',
              padding: 14,
              borderRadius: 10,
              fontSize: 10,
              overflow: 'auto',
              maxHeight: 280,
              marginTop: 10,
              border: '1px solid #333',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              textAlign: 'left',
              direction: 'ltr',
              fontFamily: 'Consolas, "Courier New", monospace',
            }}>{errorStack}</pre>
          </details>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
        }}>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('eaqari_token');
                localStorage.removeItem('eaqari_user');
                sessionStorage.removeItem('eaqari_guest');
              } catch { /* ignore */ }
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#000',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
            }}
          >
            🔐 مسح الجلسة وتسجيل الدخول
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            }}
          >
            🔄 تحديث الصفحة
          </button>
          <button
            onClick={() => reset()}
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            }}
          >
            ↻ إعادة تحميل المكون
          </button>
        </div>

        <div style={{
          marginTop: 22,
          paddingTop: 16,
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        }}>
          <div style={{
            fontSize: 12,
            color: '#94a3b8',
            textAlign: 'center',
            marginBottom: 10,
          }}>
            💡 ملاحظات سريعة لحل المشكلة:
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
            fontSize: 11,
          }}>
            <div style={{
              padding: '8px 10px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#93c5fd',
            }}>
              ✅ تأكد من وجود اتصال بالإنترنت
            </div>
            <div style={{
              padding: '8px 10px',
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#6ee7b7',
            }}>
              ✅ تأكد من أن حسابك له صلاحية الأدمن
            </div>
            <div style={{
              padding: '8px 10px',
              background: 'rgba(249, 115, 22, 0.1)',
              borderRadius: 8,
              border: '1px solid rgba(249, 115, 22, 0.2)',
              color: '#fdba74',
            }}>
              ✅ جرب مسح كوكيز وذاكرة التخزين
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
