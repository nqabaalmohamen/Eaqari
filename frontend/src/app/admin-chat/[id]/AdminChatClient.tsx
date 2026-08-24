'use client';

import { API_BASE } from '@/utils/api';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/utils/auth';

interface Message {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender: { id: number; full_name: string };
}

export default function AdminChatClient({ id }: { id: string }) {
  const router = useRouter();
  const chatId = id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('فريق الدعم');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const { user } = getSession();
    if (!user) { router.replace('/login'); return; }
    setUserId(user.id);
    setUserName(user.full_name || 'أنا');
    loadData(user.id);

    pollingRef.current = setInterval(() => fetchMessages(), 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        const { user } = getSession();
        if (user) {
          fetch(`${API_BASE}/api/chats/${chatId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ user_id: user.id })
          }).catch(() => {});
        }
      }
    } catch (e) { /* ignore */ }
  };

  const loadData = async (uid: number) => {
    try {
      const [convRes, msgRes] = await Promise.all([
        fetch(`${API_BASE}/api/chats/${chatId}`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
        fetch(`${API_BASE}/api/chats/${chatId}/messages`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      ]);
      if (convRes.ok) {
        const convData = await convRes.json();
        const conv = convData.conversation;
        // Determine admin name (the other party)
        if (conv) {
          const other = conv.buyer?.id === uid ? conv.owner : conv.buyer;
          setAdminName(other?.full_name || 'فريق الدعم');
        }
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
        fetch(`${API_BASE}/api/chats/${chatId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ user_id: uid })
        }).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempMsg: Message = {
      id: Date.now(),
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      sender: { id: userId, full_name: userName }
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`${API_BASE}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ sender_id: userId, content })
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id).concat(data.message));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50" dir="rtl">
      
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 sticky top-0 z-10 shadow-md"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
      >
        <button
          onClick={() => router.back()}
          className="text-white/80 hover:text-white transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M8.59 16.58L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </button>

        {/* Bot Avatar */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-md shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <svg viewBox="0 0 64 64" fill="white" className="w-7 h-7">
            <rect x="18" y="20" width="28" height="24" rx="5" ry="5"/>
            <rect x="24" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed"/>
            <rect x="34" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed"/>
            <rect x="27" y="37" width="10" height="3" rx="1.5" ry="1.5" fill="#7c3aed"/>
            <rect x="30" y="12" width="4" height="8" rx="2" ry="2"/>
            <circle cx="32" cy="10" r="4"/>
            <rect x="10" y="28" width="5" height="10" rx="2.5" ry="2.5"/>
            <rect x="49" y="28" width="5" height="10" rx="2.5" ry="2.5"/>
            <rect x="22" y="44" width="6" height="7" rx="2" ry="2"/>
            <rect x="36" y="44" width="6" height="7" rx="2" ry="2"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="font-black text-white text-sm">🤖 بوت الدعم الفني</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="text-white/80 text-[10px]">متاح الآن للمساعدة</span>
          </div>
        </div>
      </div>

      {/* Welcome banner */}
      <div
        className="mx-4 mt-4 p-4 rounded-2xl text-center"
        style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)', border: '1px solid #d8b4fe' }}
      >
        <div className="text-2xl mb-1">🤖</div>
        <p className="text-purple-800 font-bold text-xs leading-relaxed">
          مرحباً! هذه المحادثة مع فريق الدعم الفني لتطبيق عقاري.
          يمكنك التواصل معنا بشأن أي استفسار أو مشكلة.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '3px solid #a855f7', borderTopColor: 'transparent' }} />
              <span className="text-gray-400 text-sm">جاري التحميل...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <div className="text-5xl mb-3">💬</div>
            <p className="font-medium">ابدأ محادثتك مع فريق الدعم</p>
            <p className="text-xs mt-1 text-gray-300">سيتم الرد في أقرب وقت ممكن</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {!isMine && (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                  >
                    <svg viewBox="0 0 64 64" fill="white" className="w-5 h-5">
                      <rect x="18" y="20" width="28" height="24" rx="5" ry="5"/>
                      <rect x="24" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed"/>
                      <rect x="34" y="27" width="6" height="6" rx="2" ry="2" fill="#7c3aed"/>
                    </svg>
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                  isMine
                    ? 'text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-purple-100 rounded-bl-sm'
                }`}
                  style={isMine ? { background: 'linear-gradient(135deg,#7c3aed,#a855f7)' } : {}}
                >
                  <p className="leading-relaxed">{msg.content}</p>
                  <span className={`text-[10px] mt-1 block ${isMine ? 'text-purple-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 p-4 bg-white border-t border-gray-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto shadow-lg">
        <input
          type="text"
          placeholder="اكتب رسالتك هنا..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          className="flex-1 border border-purple-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400 text-right bg-gray-50"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40 transition-all active:scale-90 shrink-0"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 rotate-180">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
