'use client';

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

interface Conversation {
  id: number;
  buyer: { id: number; full_name: string };
  owner: { id: number; full_name: string };
  property: { id: number; city: string; type: string };
}

export default function ChatDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const chatId = id;

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { user } = getSession();
    if (!user) { router.replace('/login'); return; }
    setUserId(user.id);
    loadConversationAndMessages(user.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversationAndMessages = async (currentUserId: number) => {
    if (chatId.toString().startsWith('mock-')) {
      setConversation({
        id: 999,
        buyer: { id: currentUserId, full_name: 'أنا' },
        owner: { id: 2, full_name: 'صاحب الإعلان' },
        property: { id: parseInt(chatId.split('-')[1]), city: 'الفيوم', type: 'شقة' }
      });
      setMessages([
        { id: 1, sender_id: 2, content: 'مرحباً، كيف يمكنني مساعدتك بخصوص الإعلان؟', created_at: new Date().toISOString(), sender: { id: 2, full_name: 'صاحب الإعلان' } }
      ]);
      setLoading(false);
      return;
    }
    try {
      // Fetch conversation details + messages
      const [convRes, msgRes] = await Promise.all([
        fetch(`https://eaqari.vercel.app/api/chats/${chatId}`),
        fetch(`https://eaqari.vercel.app/api/chats/${chatId}/messages`)
      ]);
      if (convRes.ok) {
        const convData = await convRes.json();
        setConversation(convData.conversation || convData);
      }
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages(msgData.messages || []);
      }
    } catch (e) {
      console.error('Error loading chat', e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic UI: add message immediately
    const tempMsg: Message = {
      id: Date.now(),
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      sender: { id: userId, full_name: 'أنا' }
    };
    setMessages(prev => [...prev, tempMsg]);

    if (chatId.toString().startsWith('mock-')) {
      setSending(false);
      return;
    }
    try {
      const res = await fetch(`https://eaqari.vercel.app/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: userId, content })
      });
      const data = await res.json();
      if (data.message) {
        // Replace temp message with real one from server
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id).concat(data.message));
      }
    } catch (e) {
      console.error('Error sending message', e);
    } finally {
      setSending(false);
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setReportSending(true);
    try {
      await fetch(`https://eaqari.vercel.app/api/chats/${chatId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporter_id: userId, reason: reportReason })
      });
      setReportSent(true);
      setTimeout(() => { setShowReportModal(false); setReportSent(false); setReportReason(''); }, 2500);
    } catch (e) {}
    finally { setReportSending(false); }
  };

  // Determine the other person's name
  const getOtherPersonName = () => {
    if (!conversation) return 'محادثة';
    if (conversation.buyer.id === userId) return conversation.owner.full_name;
    return conversation.buyer.full_name;
  };

  const getPropertyInfo = () => {
    if (!conversation?.property) return '';
    return `${conversation.property.type} - ${conversation.property.city}`;
  };

  return (
    <div className="flex flex-col h-screen pb-20" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={() => router.push('/chats')}
          className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1.5 rounded-xl shrink-0"
        >
          🔙 رجوع
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
            {getOtherPersonName().charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 text-sm truncate">{getOtherPersonName()}</h2>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-600 font-medium">متصل الآن</span>
            </div>
            {getPropertyInfo() && (
              <p className="text-[10px] text-gray-400 truncate">{getPropertyInfo()}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowReportModal(true)}
          className="text-xs text-red-400 font-medium hover:text-red-600 transition-colors shrink-0"
        >
          🚩 إبلاغ
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-gray-400 text-sm animate-pulse">جاري التحميل...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400 text-sm">
            <div className="text-5xl mb-3">👋</div>
            <p>ابدأ المحادثة مع {getOtherPersonName()}</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <span className={`text-[10px] mt-1 block ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input - Send button on LEFT (correct for RTL) */}
      <div className="flex items-center gap-2 p-4 bg-white border-t border-gray-100 fixed bottom-[70px] left-0 right-0 max-w-md mx-auto">
        {/* Input on the right (RTL) */}
        <input
          type="text"
          placeholder="اكتب رسالة..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-right bg-gray-50"
        />
        {/* Send button on LEFT */}
        <button
          onClick={sendMessage}
          disabled={sending || !newMessage.trim()}
          className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 transition-all hover:bg-blue-700 shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 rotate-180">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-4 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}
        >
          <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-sm">🚩 الإبلاغ عن المحادثة</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            {reportSent ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bold text-green-600 text-sm">تم إرسال البلاغ للإدارة</p>
              </div>
            ) : (
              <>
                <textarea
                  placeholder="اكتب سبب الإبلاغ هنا... (مطلوب)"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl p-3 text-sm text-right resize-none h-24 focus:outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleReport}
                  disabled={reportSending || !reportReason.trim()}
                  className="w-full bg-red-500 text-white font-bold text-sm py-3.5 rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {reportSending ? 'جاري الإرسال...' : 'إرسال البلاغ'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
