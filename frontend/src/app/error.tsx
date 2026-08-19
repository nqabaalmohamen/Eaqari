'use client';

'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      console.error('[GLOBAL ERROR BOUNDARY CAUGHT]:', {
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

  const errorMessage = error?.message || 'خطأ غير معروف';
  const errorName = error?.name || 'Error';
  const errorStack = error?.stack || '';

  return (
    <div dir="rtl" style={{
      minHeight: '100vh',
      background: '#0f0f12',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 600,
        background: '#1c1c22',
        borderRadius: 14,
        padding: 24,
        border: '1px solid #333',
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
        <h2 style={{ color: '#ef4444', margin: '0 0 10px 0', fontSize: 22 }}>
          حدث خطأ أثناء تحميل الصفحة
        </h2>
        <div style={{
          background: '#111',
          borderRadius: 8,
          padding: 14,
          marginBottom: 14,
          border: '1px solid #333',
        }}>
          <div style={{ color: '#f87171', fontWeight: 'bold', marginBottom: 6 }}>
            {errorName}
          </div>
          <div style={{ color: '#fca5a5', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
            {errorMessage}
          </div>
        </div>
        {errorStack && (
          <details style={{ marginBottom: 14 }}>
            <summary style={{ cursor: 'pointer', color: '#9ca3af', fontSize: 14 }}>
              عرض التفاصيل التقنية (Stack Trace)
            </summary>
            <pre style={{
              background: '#0a0a0a',
              color: '#d1d5db',
              padding: 12,
              borderRadius: 8,
              fontSize: 11,
              overflow: 'auto',
              maxHeight: 220,
              marginTop: 8,
              border: '1px solid #222',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {errorStack}
            </pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('eaqari_token');
                localStorage.removeItem('eaqari_user');
              } catch { /* ignore */ }
              if (typeof window !== 'undefined') window.location.href = '/login';
            }}
            style={{
              flex: 1,
              minWidth: 130,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#f59e0b',
              color: '#000',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            مسح الجلسة وإعادة تسجيل الدخول
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.location.reload();
            }}
            style={{
              flex: 1,
              minWidth: 130,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#2563eb',
              color: '#fff',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            تحديث الصفحة
          </button>
          <button
            onClick={() => reset()}
            style={{
              flex: 1,
              minWidth: 130,
              padding: '12px 16px',
              borderRadius: 10,
              background: '#10b981',
              color: '#fff',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            محاولة إعادة العرض
          </button>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
          يُرجى التقاط صورة لهذه الشاشة وإرسالها للمطور لتشخيص المشكلة
        </div>
      </div>
    </div>
  );
}
