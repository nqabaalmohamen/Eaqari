'use client';

import { API_BASE } from '@/utils/api';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/utils/auth';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { user } = getSession();
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchNotifications(user.id);
  }, []);

  const fetchNotifications = async (userId: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/user/${userId}`);
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      <h1 className="text-xl font-bold text-gray-900 mb-2">الإشعارات 🔔</h1>
      
      {loading ? (
        <div className="text-center py-10 text-gray-400">جاري التحميل...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <div className="text-5xl mb-4">🔕</div>
          <h2 className="text-gray-800 font-bold mb-1">لا توجد إشعارات</h2>
          <p className="text-sm text-gray-500">سنقوم بتنبيهك عند وجود تحديثات جديدة.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <div key={notif.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                🔔
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-1">{notif.title}</h3>
                <p className="text-gray-600 text-xs leading-relaxed">{notif.message}</p>
                <span className="text-[10px] text-gray-400 block mt-2">
                  {new Date(notif.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
