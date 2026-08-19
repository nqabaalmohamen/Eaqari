'use client';

import { API_BASE } from '@/utils/api';
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/utils/auth';

interface Conversation {
  id: number;
  buyer: { id: number; full_name: string };
  owner: { id: number; full_name: string };
  property: { id: number; city: string; type: string };
  messages: Array<{ content: string; created_at: string }>;
  created_at: string;
}

export default function ChatsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const { user } = getSession();
    if (!user) {
      router.replace('/login');
      return;
    }
    setUserId(user.id);
    loadConversations(user.id);
  }, [router]);

  const loadConversations = async (uid: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/chats/user/${uid}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const getOtherParty = (conv: Conversation) => {
    if (!userId) return null;
    return conv.buyer.id === userId ? conv.owner : conv.buyer;
  };

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-gray-800">💬 رسائلي</h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="text-gray-400 text-sm animate-pulse">جاري التحميل...</div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="text-6xl">💬</div>
          <p className="text-gray-500 font-medium text-sm">لا توجد محادثات بعد</p>
          <p className="text-gray-400 text-xs">ابدأ محادثة من صفحة أي عقار</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const other = getOtherParty(conv);
            const lastMsg = conv.messages[0];
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/chats/${conv.id}`)}
                className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-all text-right"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl shrink-0">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-800 text-sm">{other?.full_name || 'مستخدم'}</h3>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('ar-EG') : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {lastMsg ? lastMsg.content : 'ابدأ المحادثة...'}
                  </p>
                  <span className="text-[10px] text-blue-500 font-medium mt-1 block">
                    {conv.property.type} - {conv.property.city}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
