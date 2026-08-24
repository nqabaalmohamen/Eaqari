'use client';

import { useEffect } from 'react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      console.error('[NEXT.JS GLOBAL ERROR CAUGHT - ROOT LEVEL]:', {
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

  const errorMessage = error?.message || 'حدث خطأ غير معروف أثناء تحميل التطبيق';
  const errorName = error?.name || 'FatalError';
  const errorStack = error?.stack || '';

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, padding: 0 }}>
        <div dir="rtl" style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
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
            maxWidth: 560,
            background: 'rgba(30, 27, 75, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            padding: 28,
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 10 }}>⚠️</div>
              <h1 style={{
                color: '#fca5a5',
                margin: '0 0 6px 0',
                fontSize: 24,
                fontWeight: 900,
              }}>
                تعذر تحميل الصفحة
              </h1>
              <p style={{ color: '#cbd5e1', fontSize: 14, margin: 0 }}>
                حدث خطأ في النظام. تم تسجيله تقنياً لمساعدتنا في التشخيص.
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}>
              <div style={{
                color: '#f87171',
                fontWeight: 'bold',
                fontSize: 13,
                marginBottom: 8,
                fontFamily: 'monospace',
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
                  padding: '8px 12px',
                  background: 'rgba(139, 92, 246, 0.1)',
                  borderRadius: 8,
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}>
                  📋 عرض التفاصيل التقنية (Stack Trace)
                </summary>
                <pre style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  color: '#d1d5db',
                  padding: 14,
                  borderRadius: 10,
                  fontSize: 10,
                  overflow: 'auto',
                  maxHeight: 260,
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
                🔐 مسح الجلسة
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
                ↻ إعادة المحاولة
              </button>
            </div>

            <div style={{
              marginTop: 22,
              fontSize: 11,
              color: '#94a3b8',
              textAlign: 'center',
              borderTop: '1px solid rgba(148, 163, 184, 0.1)',
              paddingTop: 16,
            }}>
              💡 إذا استمرت المشكلة، يُرجى مسح ذاكرة التخزين المؤقت للمتصفح وإعادة المحاولة
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
