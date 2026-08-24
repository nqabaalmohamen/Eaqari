'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/utils/auth';
import { API_BASE } from '@/utils/api';

const BOTTOM_NAV_H = 72;
const BTN_SIZE = 56;
const EDGE = 16;
const DRAG_THRESHOLD = 16;

export default function FloatingAdminChatButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [overDelete, setOverDelete] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const [pos, setPos] = useState({ x: EDGE, y: BOTTOM_NAV_H + EDGE + 8 });

  const s = useRef({
    down: false,
    hasDragged: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2500);
  };

  const openChat = async () => {
    const sess = getSession();
    const user = sess?.user;
    if (!user || !user.id) {
      showMsg('الرجاء تسجيل الدخول أولاً', 'err');
      return;
    }
    setLoading(true);
    setShowTooltip(false);
    try {
      const user_id = parseInt(String(user.id), 10);
      if (isNaN(user_id)) {
        showMsg('معرف المستخدم غير صالح', 'err');
        return;
      }
      const r = await fetch(`${API_BASE}/api/chats/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true',
        },
        body: JSON.stringify({ user_id }),
      });
      if (!r.ok) {
        showMsg(`فشل الاتصال: ${r.status}`, 'err');
        return;
      }
      const d = await r.json();
      const cid = d?.conversation?.id;
      if (cid) {
        showMsg('جاري فتح الدردشة...', 'ok');
        const path = `/admin-chat/${cid}`;
        try {
          router.push(path);
        } catch { /* ignore */ }
        setTimeout(() => {
          try {
            if (typeof window !== 'undefined' && window.location.pathname !== path) {
              window.location.href = path;
            }
          } catch { /* ignore */ }
        }, 250);
        return;
      }
      showMsg('تعذر فتح الدردشة', 'err');
    } catch (e: any) {
      console.error('openChat error', e);
      showMsg(`خطأ الشبكة: ${e?.message || 'غير معروف'}`, 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('bot_dismissed') === '1') {
      setDismissed(true);
      return;
    }
    const a = setTimeout(() => setShowTooltip(true), 1000);
    const b = setTimeout(() => setShowTooltip(false), 6000);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    s.current.down = true;
    s.current.hasDragged = false;
    s.current.startX = e.clientX;
    s.current.startY = e.clientY;
    s.current.origX = pos.x;
    s.current.origY = pos.y;
    setShowTooltip(false);
    setShowDelete(true);
    setOverDelete(false);
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!s.current.down) return;
    const dx = e.clientX - s.current.startX;
    const dy = s.current.startY - e.clientY;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      s.current.hasDragged = true;
    }
    if (typeof window === 'undefined') return;
    const maxX = window.innerWidth - BTN_SIZE - EDGE;
    const maxY = window.innerHeight - BTN_SIZE - EDGE;
    let nx = s.current.origX + dx;
    let ny = s.current.origY + dy;
    nx = Math.max(EDGE, Math.min(maxX, nx));
    ny = Math.max(BOTTOM_NAV_H + EDGE, Math.min(maxY, ny));
    setPos({ x: nx, y: ny });

    const th = window.innerHeight - 150;
    setOverDelete(e.clientY >= th);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!s.current.down) return;
    s.current.down = false;
    try { (e.currentTarget as Element).releasePointerCapture(e.pointerId); } catch {}
    const overDel = overDelete || (typeof window !== 'undefined' && e.clientY >= window.innerHeight - 120);
    if (s.current.hasDragged && overDel) {
      setDismissed(true);
      showMsg('تم إخفاء زر البوت', 'ok');
      try { sessionStorage.setItem('bot_dismissed', '1'); } catch {}
    }
    setShowDelete(false);
    setOverDelete(false);
  };

  const onPointerCancel = () => {
    s.current.down = false;
    setShowDelete(false);
    setOverDelete(false);
  };

  const onButtonClick = (e: React.MouseEvent) => {
    if (s.current.hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      s.current.hasDragged = false;
      return;
    }
    if (loading) return;
    openChat();
  };

  if (dismissed) {
    if (toast) {
      return (
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 24, zIndex: 9999 }}>
          <div style={{
            padding: '10px 18px',
            borderRadius: 999,
            background: toast.type === 'ok' ? '#10b981' : '#ef4444',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          }}>{toast.text}</div>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 24, zIndex: 9999 }}>
          <div style={{
            padding: '10px 18px',
            borderRadius: 999,
            background: toast.type === 'ok' ? '#10b981' : '#ef4444',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
          }}>{toast.text}</div>
        </div>
      )}

      {/* Delete zone */}
      {showDelete && (
        <div
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: 180,
            zIndex: 40,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: overDelete
              ? 'linear-gradient(to top, rgba(239,68,68,0.55) 0%, rgba(239,68,68,0.25) 40%, transparent 100%)'
              : 'linear-gradient(to top, rgba(239,68,68,0.2) 0%, transparent 70%)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              background: overDelete ? '#dc2626' : '#ef4444',
              border: `4px solid ${overDelete ? '#fff' : 'rgba(255,255,255,0.85)'}`,
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              marginBottom: 26,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: overDelete ? 'scale(1.25)' : 'scale(1)',
              transition: 'all 0.18s ease',
            }}
          >
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 38, height: 38 }}>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </div>
        </div>
      )}

      {/* Single button element — drag + click both handled here */}
      <button
        type="button"
        onClick={onButtonClick}
        disabled={loading}
        aria-label="دردشة الدعم الفني"
        style={{
          position: 'fixed',
          left: pos.x,
          bottom: pos.y,
          width: BTN_SIZE,
          height: BTN_SIZE,
          zIndex: 50,
          touchAction: 'none',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          borderRadius: 999,
          border: 'none',
          padding: 0,
          margin: 0,
          background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
          boxShadow: '0 10px 30px rgba(168,85,247,0.6), 0 3px 8px rgba(124,58,237,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: loading ? 'wait' : 'grab',
          transform: overDelete && s.current.down ? 'scale(0.8)' : 'scale(1)',
          transition: s.current.down || s.current.hasDragged ? 'none' : 'all 0.2s ease-out',
          opacity: overDelete && s.current.down ? 0.7 : 1,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseEnter={() => !s.current.down && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Tooltip */}
        <div
          style={{
            position: 'absolute',
            bottom: BTN_SIZE + 12,
            left: 0,
            opacity: showTooltip ? 1 : 0,
            transform: showTooltip ? 'translateY(0)' : 'translateY(8px)',
            transition: 'all 0.35s ease',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
          dir="rtl"
        >
          <div
            style={{
              background: '#111827',
              color: '#fff',
              padding: '8px 13px',
              borderRadius: 16,
              fontWeight: 700,
              fontSize: 12,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
            }}
          >
            👋 تواصل معانا
          </div>
          <div
            style={{
              width: 12,
              height: 12,
              background: '#111827',
              transform: 'rotate(45deg)',
              marginLeft: 22,
              marginTop: -6,
              borderRadius: 2,
            }}
          />
        </div>

        {!loading && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 999,
              background: '#a855f7',
              opacity: 0.25,
              animation: 'ping 1.6s cubic-bezier(0,0,0.2,1) infinite',
              pointerEvents: 'none',
            }}
          />
        )}

        {loading ? (
          <svg style={{ width: 24, height: 24, color: '#fff', animation: 'spin 1s linear infinite', position: 'relative', zIndex: 1 }} fill="none" viewBox="0 0 24 24">
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg viewBox="0 0 64 64" fill="white" style={{ width: 34, height: 34, position: 'relative', zIndex: 1 }}>
            <rect x="18" y="20" width="28" height="24" rx="5" ry="5" />
            <rect x="24" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed" />
            <rect x="34" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed" />
            <rect x="27" y="37" width="10" height="3" rx="1.5" ry="1.5" fill="#7c3aed" />
            <rect x="30" y="12" width="4" height="8" rx="2" ry="2" />
            <circle cx="32" cy="10" r="4" />
            <rect x="10" y="28" width="5" height="10" rx="2.5" ry="2.5" />
            <rect x="49" y="28" width="5" height="10" rx="2.5" ry="2.5" />
            <rect x="22" y="44" width="6" height="7" rx="2" ry="2" />
            <rect x="36" y="44" width="6" height="7" rx="2" ry="2" />
          </svg>
        )}
      </button>
    </>
  );
}
