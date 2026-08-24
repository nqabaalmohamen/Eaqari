'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSession, UserSession } from '@/utils/auth';

import { API_BASE } from '@/utils/api';

export default function BottomNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const { user: currentSession } = getSession();
    setUser(currentSession);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chats/unread/${user.id}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (pathname.startsWith('/chats')) {
      setUnreadCount(0);
    }
  }, [pathname]);

  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin' || user?.role === 'Moderator';

  const navItems = [
    { name: 'الرئيسية', icon: '🏠', path: '/' },
    { name: 'رسائلي', icon: '💬', path: '/chats', protected: true },
    { name: 'أضف عقار', icon: '➕', path: '/add-property', isSpecial: true, protected: true },
    { name: 'إعلاناتي', icon: '📋', path: '/my-ads', protected: true },
    isAdmin
      ? { name: 'الإدارة', icon: '⚙️', path: '/admin', protected: true }
      : { name: 'حسابي', icon: '👤', path: '/dashboard', protected: true },
  ];

  const handleNavClick = (e: any, item: any) => {
    if (item.protected && !user) {
      e.preventDefault();
      window.location.href = '/login';
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] px-2 py-2 flex justify-around items-center z-40 pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path.startsWith('/dashboard') && pathname === '/dashboard');

        if (item.isSpecial) {
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={(e) => handleNavClick(e, item)}
              className="flex flex-col items-center justify-center -translate-y-4"
            >
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-transform active:scale-95 text-lg font-bold">
                {item.icon}
              </div>
              <span className="text-[10px] text-gray-500 font-bold mt-1">{item.name}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={(e) => handleNavClick(e, item)}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all relative ${
              isActive ? 'text-blue-600 font-bold' : 'text-gray-400 font-medium'
            }`}
          >
            <span className="text-lg relative">
              {item.icon}
              {item.name === 'رسائلي' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
                  {unreadCount > 9 ? '+9' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[10px]">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
