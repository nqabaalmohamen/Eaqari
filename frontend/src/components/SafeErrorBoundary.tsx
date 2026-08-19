'use client';

'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class SafeErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    try {
      console.error(`[SAFE ERROR BOUNDARY] ${this.props.name || 'component'}:`, {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
      });
    } catch {
      /* ignore */
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const err = this.state.error;
      const info = this.state.errorInfo;
      return (
        <div dir="rtl" style={{
          padding: 16,
          margin: 10,
          borderRadius: 12,
          background: '#2a1010',
          border: '1px solid #7f1d1d',
          color: '#fecaca',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🚨</div>
          <div style={{ fontWeight: 'bold', color: '#fca5a5', fontSize: 16, marginBottom: 6 }}>
            خطأ في المكوّن: {this.props.name || 'غير محدد'}
          </div>
          {err && (
            <div style={{
              background: '#1a0a0a',
              padding: 10,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 8,
              border: '1px solid #5a1515',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}>
              <div style={{ color: '#f87171', fontWeight: 'bold' }}>{err.name}</div>
              <div style={{ marginTop: 4 }}>{err.message}</div>
              {err.stack && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', color: '#d97706' }}>Stack Trace</summary>
                  <pre style={{
                    fontSize: 10,
                    color: '#9ca3af',
                    overflow: 'auto',
                    maxHeight: 160,
                    marginTop: 6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}>{err.stack}</pre>
                </details>
              )}
            </div>
          )}
          {info?.componentStack && (
            <details style={{ marginBottom: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#c084fc' }}>
                React Component Stack
              </summary>
              <pre style={{
                fontSize: 10,
                background: '#1a0a1a',
                padding: 8,
                borderRadius: 6,
                marginTop: 6,
                color: '#c084fc',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 160,
                overflow: 'auto',
              }}>{info.componentStack}</pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              إعادة تحميل المكوّن
            </button>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              تحديث الصفحة بالكامل
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('eaqari_token');
                  localStorage.removeItem('eaqari_user');
                } catch {/* ignore */}
                if (typeof window !== 'undefined') window.location.href = '/login';
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: '#d97706',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              مسح الجلسة والخروج
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default SafeErrorBoundary;
