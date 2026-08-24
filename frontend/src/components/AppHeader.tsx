'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { getSession } from '@/utils/auth';
import { API_BASE } from '@/utils/api';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function AppHeader() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotificationId = useRef<number | null>(null);

  useEffect(() => {
    const checkNotifications = async () => {
      const { user } = getSession();
      if (!user) return;

      try {
        const res = await fetch(`${API_BASE}/api/notifications/user/${user.id}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          const notifications = data.notifications || [];
          
          const unread = notifications.filter((n: any) => !n.is_read);
          setUnreadCount(unread.length);

          if (unread.length > 0) {
            // Check for new notifications to push natively
            const latest = unread[0]; // Assuming ordered by created_at desc
            
            if (lastNotificationId.current !== null && latest.id > lastNotificationId.current) {
              // It's a new notification! Trigger native push
              try {
                const permStatus = await LocalNotifications.checkPermissions();
                if (permStatus.display !== 'granted') {
                  await LocalNotifications.requestPermissions();
                }
                
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      id: latest.id,
                      title: latest.title,
                      body: latest.message,
                      schedule: { at: new Date(Date.now() + 1000) },
                      sound: 'beep.wav'
                    }
                  ]
                });
              } catch (e) {
                console.error('Error triggering local notification:', e);
              }
            }
            
            // Update last seen
            lastNotificationId.current = latest.id;
          } else if (notifications.length > 0) {
            lastNotificationId.current = notifications[0].id;
          }
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 5000); // Check every 5 seconds for faster push

    // Request permissions on mount just in case
    LocalNotifications.requestPermissions().catch(console.error);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [pathname]);

  return (
    <header className="w-full bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between sticky top-0 z-40 shadow-sm" dir="rtl">
      <div className="flex items-center gap-2">
        <Link href="/">
          <img 
            src="/logo.png" 
            alt="Eaqari" 
            className="h-16 w-auto object-contain"
          />
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors relative">
          <span>🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
