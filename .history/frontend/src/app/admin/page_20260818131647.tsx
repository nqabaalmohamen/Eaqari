'use client';

import { API_BASE } from '@/utils/api';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession } from '@/utils/auth';
import { SafeErrorBoundary } from '@/components/SafeErrorBoundary';

type Tab =
  | 'overview'
  | 'users'
  | 'properties'
  | 'reports'
  | 'verifications'
  | 'conversations'
  | 'settings';

// ─── SAFETY HELPERS ────────────────────────────────────────────
function ensureArray(v: any): any[] {
  return Array.isArray(v) ? v : [];
}
function ensureObject(v: any, fallback: any = {}): any {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : fallback;
}
function safeNum(v: any, fallback: number = 0): number {
  try {
    if (v == null) return fallback;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return fallback;
  } catch { return fallback; }
}
function safeStr(v: any, fallback: string = ''): string {
  try {
    if (v == null) return fallback;
    const s = String(v);
    return s;
  } catch { return fallback; }
}
function safeGet<T = any>(obj: any, path: string, fallback?: T): T {
  try {
    const parts = path.split('.');
    let curr: any = obj;
    for (const p of parts) {
      if (curr == null) return fallback as T;
      if (Array.isArray(curr)) {
        const idx = Number(p);
        if (!Number.isFinite(idx) || idx < 0 || idx >= curr.length) return fallback as T;
        curr = curr[idx];
      } else if (typeof curr === 'object') {
        curr = curr[p];
      } else {
        return fallback as T;
      }
    }
    return (curr == null ? fallback : curr) as T;
  } catch { return fallback as T; }
}
function safeArrGet(obj: any, index: number, fallback: any = null): any {
  try {
    const arr = ensureArray(obj);
    if (index >= 0 && index < arr.length) return arr[index];
    return fallback;
  } catch { return fallback; }
}
function safePrice(v: any): string {
  try {
    const n = safeNum(v, 0);
    return n.toLocaleString('ar-EG');
  } catch { return '0'; }
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [adminName, setAdminName] = useState('');

  // Real data states
  const [users, setUsers] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Bulk selection states
  const [selectedPropIds, setSelectedPropIds] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick notification sender
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);

  // Search / filter states
  const [userSearch, setUserSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'rejected' | 'sold' | 'rented'>('all');

  // Settings states
  const [wipeConfirm, setWipeConfirm] = useState('');
  const [wipeLoading, setWipeLoading] = useState(false);

  // User edit modal
  const [editingUser, setEditingUser] = useState<any>(null);

  // Rejection modals
  const [rejectModal, setRejectModal] = useState<{ propertyId: number | null; reason: string; submitting: boolean }>({ propertyId: null, reason: '', submitting: false });
  const [bulkRejectModal, setBulkRejectModal] = useState<{ open: boolean; reason: string; submitting: boolean }>({ open: false, reason: '', submitting: false });
  const [editRejectReason, setEditRejectReason] = useState<{ propertyId: number | null; reason: string; submitting: boolean }>({ propertyId: null, reason: '', submitting: false });

  const showMsg = (type: 'success' | 'error', text: string) => {
    try {
      setGlobalMessage({ type, text });
      setTimeout(() => setGlobalMessage(null), 3500);
    } catch { /* ignore */ }
  };

  const safeFetch = async (url: string, options?: RequestInit): Promise<any> => {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (e: any) {
      // Return a fake "failed response" object that behaves consistently
      return {
        ok: false,
        status: 500,
        statusText: e?.message || 'Network error',
        json: async () => [],
      };
    }
  };

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        safeFetch(`${API_BASE}/api/admin/users`),
        safeFetch(`${API_BASE}/api/properties?admin_view=true`),
        safeFetch(`${API_BASE}/api/admin/reports`),
        safeFetch(`${API_BASE}/api/admin/verifications`),
        safeFetch(`${API_BASE}/api/admin/conversations`),
        safeFetch(`${API_BASE}/api/admin/stats`),
      ]);

      const [usersRes, propsRes, reportsRes, verifRes, convsRes, statsRes] = results;

      const parseJSON = async (r: any, fallback: any = [], expectArray = true) => {
        try {
          if (!r) return fallback;
          // Non-2xx responses always return fallback — avoid parsing HTML error pages
          if (!r.ok) return fallback;
          // Guard against HTML/text responses (e.g. Vercel deployment error page)
          const contentType = r.headers?.get ? String(r.headers.get('content-type') || '') : '';
          if (contentType && !contentType.includes('application/json') && !contentType.includes('+json')) {
            console.warn('[Admin] Expected JSON but got:', contentType, '— using fallback');
            return fallback;
          }
          const raw = await r.text();
          if (!raw || !raw.trim()) return fallback;
          // First char check: JSON arrays start with '[', objects with '{'
          const firstChar = raw.trim().charAt(0);
          if (expectArray && firstChar !== '[') {
            // Maybe API wrapped array in {data: [...]} object
            try {
              const maybeObj = JSON.parse(raw);
              if (maybeObj && typeof maybeObj === 'object') {
                // Try common wrappers
                const candidates = [maybeObj.data, maybeObj.result, maybeObj.items, maybeObj.users, maybeObj.properties, maybeObj.reports, maybeObj.verifications, maybeObj.conversations];
                for (const c of candidates) {
                  if (Array.isArray(c)) return c;
                }
                if (!expectArray && typeof maybeObj === 'object' && maybeObj !== null) return maybeObj;
              }
            } catch { /* ignore */ }
            return fallback;
          }
          const parsed = JSON.parse(raw);
          // If caller expected array but got object with array inside, unwrap it
          if (expectArray && !Array.isArray(parsed) && parsed && typeof parsed === 'object') {
            const candidates = [parsed.data, parsed.result, parsed.items, parsed.users, parsed.properties, parsed.reports, parsed.verifications, parsed.conversations];
            for (const c of candidates) {
              if (Array.isArray(c)) return c;
            }
            return fallback;
          }
          return parsed;
        } catch (e) {
          console.warn('[Admin] JSON parse failed — using fallback. Reason:', e);
          return fallback;
        }
      };

      const parsedUsers = await parseJSON(usersRes, [], true);
      const parsedProps = await parseJSON(propsRes, [], true);
      const parsedReports = await parseJSON(reportsRes, [], true);
      const parsedVerifs = await parseJSON(verifRes, [], true);
      const parsedConvs = await parseJSON(convsRes, [], true);
      const parsedStats = await parseJSON(statsRes, null, false);

      setUsers(Array.isArray(parsedUsers) ? parsedUsers : []);
      setProperties(Array.isArray(parsedProps) ? parsedProps : []);
      setReports(Array.isArray(parsedReports) ? parsedReports : []);
      setVerifications(Array.isArray(parsedVerifs) ? parsedVerifs : []);
      setConversations(Array.isArray(parsedConvs) ? parsedConvs : []);
      setStats(parsedStats && typeof parsedStats === 'object' ? parsedStats : null);
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setUsers([]);
      setProperties([]);
      setReports([]);
      setVerifications([]);
      setConversations([]);
      setStats(null);
      showMsg('error', 'تعذر تحميل البيانات. يرجى تحديث الصفحة.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let session;
    try {
      session = getSession();
    } catch {
      session = { token: null, user: null };
    }
    const { user } = session;
    const roleName = user?.role ? String(user.role) : '';
    const isAdminRole =
      roleName === 'Super Admin' ||
      roleName === 'Admin' ||
      roleName === 'Moderator' ||
      (roleName === 'Owner' && user?.full_name === 'مشرف النظام');

    if (!user || !isAdminRole) {
      try {
        router.replace('/login');
      } catch {
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
      return;
    }
    if (!cancelled) {
      setAdminName(user.full_name || '');
      fetchAllAdminData();
    }
    return () => { cancelled = true; };
  }, [router]);

  function safeConfirm(msg: string): boolean {
    try { return !!confirm(msg); } catch { return false; }
  }
  async function safeJson(res: any, fallback: any = null) {
    try { return await res.json(); } catch { return fallback; }
  }

  // ─── USER ACTIONS ───────────────────────────────────────────────
  const handleBanUser = async (id: number, currentStatus: string) => {
    setActionLoading(`user-ban-${id}`);
    try {
      const endpoint = currentStatus === 'active' ? 'ban' : 'unban';
      const res = await safeFetch(`${API_BASE}/api/admin/users/${id}/${endpoint}`, { method: 'PUT' });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === id
          ? { ...u, status: currentStatus === 'active' ? 'suspended' : 'active' }
          : u));
        showMsg('success', currentStatus === 'active' ? 'تم حظر المستخدم' : 'تم فك حظر المستخدم');
      } else showMsg('error', 'فشل العملية');
    } catch (e) { showMsg('error', 'خطأ في الشبكة'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!safeConfirm('هل أنت متأكد من حذف هذا الحساب نهائياً؟ كل إعلاناته ومحادثاته سيتم حذفها!')) return;
    setActionLoading(`user-del-${id}`);
    try {
      const res = await safeFetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        showMsg('success', 'تم حذف الحساب بنجاح');
      } else showMsg('error', 'فشل الحذف');
    } catch (e) { showMsg('error', 'خطأ في الشبكة'); }
    finally { setActionLoading(null); }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setActionLoading('user-edit');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editingUser.full_name,
          phone: editingUser.phone,
          email: editingUser.email,
          status: editingUser.status,
          is_verified: editingUser.is_verified,
          governorate: editingUser.governorate,
          city: editingUser.city,
          address: editingUser.address
        })
      }).catch(e => ({ ok: false, json: async () => ({}) }));
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...editingUser } : u));
        showMsg('success', 'تم تحديث بيانات المستخدم');
        setEditingUser(null);
      } else showMsg('error', 'فشل التحديث');
    } catch (e) { showMsg('error', 'خطأ في الشبكة'); }
    finally { setActionLoading(null); }
  };

  // ─── PROPERTY ACTIONS ──────────────────────────────────────────
  const handlePropertyStatus = async (id: number, status: string) => {
    // When rejecting, open modal for reason instead
    if (status === 'rejected') {
      setRejectModal({ propertyId: id, reason: '', submitting: false });
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/properties/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      }).catch(e => ({ ok: false }));
      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === id ? { ...p, status, rejection_reason: status === 'active' ? null : p.rejection_reason } : p));
        showMsg('success', `تم تغيير الحالة إلى: ${status === 'active' ? 'نشط' : status === 'pending' ? 'معلق' : status === 'rejected' ? 'مرفوض' : status}`);
      }
    } catch (e) { showMsg('error', 'فشل تحديث الحالة'); }
  };

  const submitSingleReject = async () => {
    const id = rejectModal.propertyId;
    if (!id) return;
    const reason = rejectModal.reason.trim();
    setRejectModal(m => ({ ...m, submitting: true }));
    try {
      const res = await fetch(`${API_BASE}/api/properties/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
      }).catch(e => ({ ok: false }));
      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'rejected', rejection_reason: reason || 'لا يوجد سبب مذكور' } : p));
        showMsg('success', 'تم رفض الإعلان مع إضافة السبب');
        setRejectModal({ propertyId: null, reason: '', submitting: false });
      } else {
        showMsg('error', 'فشل الرفض');
        setRejectModal(m => ({ ...m, submitting: false }));
      }
    } catch (e) {
      showMsg('error', 'خطأ في الشبكة');
      setRejectModal(m => ({ ...m, submitting: false }));
    }
  };

  const openEditRejectReason = (prop: any) => {
    setEditRejectReason({ propertyId: prop.id, reason: prop.rejection_reason || '', submitting: false });
  };

  const submitEditRejectReason = async () => {
    const id = editRejectReason.propertyId;
    if (!id) return;
    const reason = editRejectReason.reason.trim();
    setEditRejectReason(m => ({ ...m, submitting: true }));
    try {
      const res = await fetch(`${API_BASE}/api/properties/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason })
      }).catch(e => ({ ok: false }));
      if (res.ok) {
        setProperties(prev => prev.map(p => p.id === id ? { ...p, rejection_reason: reason || 'لا يوجد سبب مذكور' } : p));
        showMsg('success', 'تم تحديث سبب الرفض');
        setEditRejectReason({ propertyId: null, reason: '', submitting: false });
      } else {
        showMsg('error', 'فشل التحديث');
        setEditRejectReason(m => ({ ...m, submitting: false }));
      }
    } catch (e) {
      showMsg('error', 'خطأ في الشبكة');
      setEditRejectReason(m => ({ ...m, submitting: false }));
    }
  };

  const handleDeleteProperty = async (id: number) => {
    if (!safeConfirm('هل أنت متأكد من حذف هذا الإعلان نهائياً؟')) return;
    setActionLoading(`prop-del-${id}`);
    try {
      const res = await safeFetch(`${API_BASE}/api/admin/properties/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProperties(prev => prev.filter(p => p.id !== id));
        showMsg('success', 'تم حذف الإعلان');
      } else showMsg('error', 'فشل الحذف');
    } catch (e) { showMsg('error', 'خطأ في الشبكة'); }
    finally { setActionLoading(null); }
  };

  const handleToggleFeatured = async (id: number) => {
    try {
      const res = await safeFetch(`${API_BASE}/api/admin/properties/${id}/toggle-featured`, { method: 'PUT' });
      if (res.ok) {
        const data = await safeJson(res, {});
        setProperties(prev => prev.map(p => p.id === id ? { ...p, is_featured: data?.is_featured ?? p.is_featured } : p));
        if (data?.message) showMsg('success', data.message);
      }
    } catch { /* ignore */ }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedPropIds.length === 0) { showMsg('error', 'لم يتم اختيار أي إعلان'); return; }
    // When rejecting in bulk, open modal for reason
    if (status === 'rejected') {
      setBulkRejectModal({ open: true, reason: '', submitting: false });
      return;
    }
    setActionLoading('bulk-status');
    try {
      const res = await fetch('${API_BASE}/api/admin/properties/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPropIds, status })
      }).catch(e => ({ ok: false, json: async () => ({}) }));
      if (res.ok) {
        const data = await safeJson(res, {});
        setProperties(prev => prev.map(p => selectedPropIds.includes(p.id) ? { ...p, status, rejection_reason: status === 'active' ? null : p.rejection_reason } : p));
        setSelectedPropIds([]);
        setSelectAll(false);
        if (data?.message) showMsg('success', data.message);
      }
    } catch (e) { showMsg('error', 'فشل التحديث الجماعي'); }
    finally { setActionLoading(null); }
  };

  const submitBulkReject = async () => {
    if (selectedPropIds.length === 0) { setBulkRejectModal({ open: false, reason: '', submitting: false }); return; }
    const reason = bulkRejectModal.reason.trim();
    setBulkRejectModal(m => ({ ...m, submitting: true }));
    setActionLoading('bulk-status');
    try {
      const res = await fetch('${API_BASE}/api/admin/properties/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedPropIds, status: 'rejected', rejection_reason: reason })
      }).catch(e => ({ ok: false, json: async () => ({}) }));
      if (res.ok) {
        const data = await safeJson(res, {});
        setProperties(prev => prev.map(p => selectedPropIds.includes(p.id) ? { ...p, status: 'rejected', rejection_reason: reason || 'لا يوجد سبب مذكور' } : p));
        setSelectedPropIds([]);
        setSelectAll(false);
        setBulkRejectModal({ open: false, reason: '', submitting: false });
        if (data?.message) showMsg('success', data.message);
      } else {
        showMsg('error', 'فشل الرفض الجماعي');
        setBulkRejectModal(m => ({ ...m, submitting: false }));
      }
    } catch (e) { showMsg('error', 'خطأ في الشبكة'); setBulkRejectModal(m => ({ ...m, submitting: false })); }
    finally { setActionLoading(null); }
  };

  const togglePropSelect = (id: number) => {
    try {
      setSelectedPropIds(prev => {
        const exists = prev.includes(id);
        return exists ? prev.filter(i => i !== id) : [...prev, id];
      });
    } catch { /* ignore */ }
  };

  // ─── REPORT ACTIONS ────────────────────────────────────────────
  const handleResolveReport = async (reportId: number, newStatus: string, notes?: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, admin_notes: notes || '' })
      }).catch(e => ({ ok: false }));
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
        showMsg('success', 'تم تحديث البلاغ');
      }
    } catch (e) { showMsg('error', 'فشل التحديث'); }
  };

  // ─── VERIFICATION ACTIONS ──────────────────────────────────────
  const handleApproveVerification = async (id: number) => {
    try {
      const res = await safeFetch(`${API_BASE}/api/admin/verifications/${id}/approve`, { method: 'PUT' });
      if (res.ok) {
        const data = await safeJson(res, {});
        setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'approved' } : v));
        const affected = verifications.find(v => v.id === id);
        if (affected?.user_id) {
          setUsers(prev => prev.map(u => u.id === affected.user_id ? { ...u, is_verified: true } : u));
        }
        if (data?.message) showMsg('success', data.message);
      }
    } catch (e) { showMsg('error', 'فشل الموافقة'); }
  };

  const handleRejectVerification = async (id: number) => {
    try {
      const res = await safeFetch(`${API_BASE}/api/admin/verifications/${id}/reject`, { method: 'PUT' });
      if (res.ok) {
        const data = await safeJson(res, {});
        setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v));
        if (data?.message) showMsg('success', data.message);
      }
    } catch (e) { showMsg('error', 'فشل الرفض'); }
  };

  // ─── NOTIFICATION ACTION ───────────────────────────────────────
  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    try {
      await fetch('${API_BASE}/api/notifications/admin/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifTitle, message: notifMessage, user_id: 'all' })
      }).catch(e => ({ ok: false }));
      showMsg('success', 'تم إرسال الإشعار لجميع المستخدمين!');
      setNotifTitle('');
      setNotifMessage('');
    } catch (e) { showMsg('error', 'فشل الإرسال'); }
    finally { setNotifSending(false); }
  };

  // ─── WIPE ALL PROPERTIES ───────────────────────────────────────
  const handleWipeAll = async () => {
    if (wipeConfirm !== 'WIPE_ALL_PROPERTIES') {
      showMsg('error', 'اكتب WIPE_ALL_PROPERTIES للتأكيد');
      return;
    }
    if (!safeConfirm('⚠️ سيتم حذف جميع الإعلانات والمحادثات والمعاملات نهائياً! هل أنت متأكد؟')) return;
    setWipeLoading(true);
    try {
      const res = await fetch('${API_BASE}/api/admin/properties/wipe/all', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'WIPE_ALL_PROPERTIES' })
      }).catch(e => ({ ok: false }));
      if (res.ok) {
        showMsg('success', 'تم مسح جميع الإعلانات بنجاح');
        setProperties([]);
        setWipeConfirm('');
        setSelectedPropIds([]);
        setSelectAll(false);
        fetchAllAdminData();
      } else showMsg('error', 'فشل المسح');
    } catch (e) { showMsg('error', 'خطأ في الشبكة'); }
    finally { setWipeLoading(false); }
  };

  // ─── DATA AGGREGATIONS (SAFE) ─────────────────────────────────
  const safeUsers = useMemo(() => ensureArray(users), [users]);
  const safeProperties = useMemo(() => ensureArray(properties), [properties]);
  const safeReports = useMemo(() => ensureArray(reports), [reports]);
  const safeVerifications = useMemo(() => ensureArray(verifications), [verifications]);
  const safeConversations = useMemo(() => ensureArray(conversations), [conversations]);
  const safeStats = useMemo(() => ensureObject(stats, null), [stats]);

  const activeProperties = useMemo(
    () => safeProperties.filter(p => p?.status === 'active'),
    [safeProperties]
  );
  const pendingProperties = useMemo(
    () => safeProperties.filter(p => p?.status === 'pending'),
    [safeProperties]
  );
  const rejectedProps = useMemo(
    () => safeProperties.filter(p => p?.status === 'rejected'),
    [safeProperties]
  );
  const bannedUsers = useMemo(
    () => safeUsers.filter(u => u?.status === 'suspended'),
    [safeUsers]
  );
  const verifiedUsers = useMemo(
    () => safeUsers.filter(u => !!u?.is_verified),
    [safeUsers]
  );

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return safeUsers;
    try {
      return safeUsers.filter(u => {
        const fn = String(u?.full_name || '').toLowerCase();
        const ph = String(u?.phone || '').toLowerCase();
        const em = String(u?.email || '').toLowerCase();
        const ct = String(u?.city || '').toLowerCase();
        return fn.includes(q) || ph.includes(q) || em.includes(q) || ct.includes(q);
      });
    } catch {
      return safeUsers;
    }
  }, [safeUsers, userSearch]);

  const filteredProperties = useMemo(() => {
    try {
      const q = propertySearch.trim().toLowerCase();
      return safeProperties.filter(p => {
        const p2 = ensureObject(p);
        const matchesSearch = !q || (
          String(p2.description || '').toLowerCase().includes(q) ||
          String(p2.type || '').toLowerCase().includes(q) ||
          String(p2.city || '').toLowerCase().includes(q) ||
          String(p2.region || '').toLowerCase().includes(q) ||
          String(p2.owner?.full_name || '').toLowerCase().includes(q)
        );
        const matchesStatus = statusFilter === 'all' || p2.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
    } catch {
      return safeProperties;
    }
  }, [safeProperties, propertySearch, statusFilter]);

  const filteredReports = useMemo(() => {
    try {
      return safeReports.filter(r => reportFilter === 'all' || r?.status === reportFilter);
    } catch {
      return safeReports;
    }
  }, [safeReports, reportFilter]);

  useEffect(() => {
    if (selectAll) {
      try {
        setSelectedPropIds(filteredProperties.map((p: any) => p?.id).filter(Boolean) as number[]);
      } catch { /* ignore */ }
    }
  }, [selectAll, filteredProperties.length]);

  // ─── TABS CONFIG ───────────────────────────────────────────────
  const pendingReportsCount = safeReports.filter(r => r?.status === 'pending').length;
  const pendingVerificationsCount = safeVerifications.filter(v => v?.status === 'pending').length;
  const tabs: { id: Tab; label: string; icon: string; badge?: number }[] = useMemo(() => [
    { id: 'overview', label: 'نظرة عامة', icon: '📊' },
    { id: 'users', label: 'المستخدمين', icon: '👥', badge: safeUsers.length },
    { id: 'properties', label: 'الإعلانات', icon: '🏠', badge: safeProperties.length },
    { id: 'reports', label: 'البلاغات', icon: '🚩', badge: pendingReportsCount > 0 ? pendingReportsCount : undefined },
    { id: 'verifications', label: 'التحقق', icon: '✅', badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : undefined },
    { id: 'conversations', label: 'المحادثات', icon: '💬', badge: safeConversations.length },
    { id: 'settings', label: 'الإعدادات', icon: '⚙️' },
  ], [safeUsers.length, safeProperties.length, pendingReportsCount, pendingVerificationsCount, safeConversations.length]);

  const formatDate = (d: any) => {
    try {
      if (d == null || d === '') return 'غير محدد';
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return 'غير محدد';
      return dt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'غير محدد'; }
  };

  const safeMediaUrl = (media: any, fallback: string = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'): string => {
    try {
      const first = ensureArray(media)[0];
      const url = first?.media_url || first?.url || null;
      if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
        return url;
      }
      return fallback;
    } catch { return fallback; }
  };

  const recentUsersView = useMemo(() => {
    try {
      const fromStats = ensureArray(safeGet(safeStats, 'recent_users', null));
      const pool = fromStats.length > 0 ? fromStats : safeUsers;
      return ensureArray(pool).slice(0, 5);
    } catch { return []; }
  }, [safeStats, safeUsers]);

  const recentPropertiesView = useMemo(() => {
    try {
      const fromStats = ensureArray(safeGet(safeStats, 'recent_properties', null));
      const pool = fromStats.length > 0 ? fromStats : safeProperties;
      return ensureArray(pool).slice(0, 5);
    } catch { return []; }
  }, [safeStats, safeProperties]);

  // ─── LOADING SCREEN ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold text-sm">جاري تحميل لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <SafeErrorBoundary name="لوحة تحكم الأدمن">
      <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
        {/* Global Message */}
        {globalMessage && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg font-bold text-xs border ${
            globalMessage.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {globalMessage.text}
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white p-5 rounded-b-[40px] shadow-md mb-6 relative overflow-hidden">
          <div className="absolute left-[-30px] top-[-30px] w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute right-[-20px] bottom-[-40px] w-32 h-32 bg-white/5 rounded-full" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">وحدة التحكم الإدارية</span>
                  {safeStats && (
                    <span className="bg-green-500/30 text-green-50 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                      مراقبة مباشرة
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-black">لوحة التحكم</h1>
                <p className="text-sm text-blue-100 mt-0.5">أهلاً بك، {adminName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAllAdminData}
                  className="bg-white/15 hover:bg-white/25 p-2 rounded-xl text-xs font-bold transition-colors"
                  title="تحديث البيانات"
                >
                  🔄
                </button>
                <Link href="/" className="bg-white/15 hover:bg-white/25 p-2 rounded-xl text-xs font-bold transition-colors" title="عرض الموقع">
                  🌐
                </Link>
                <button
                  onClick={() => { try { clearSession(); } catch { /* ignore */ } try { router.replace('/login'); } catch { if (typeof window !== 'undefined') window.location.href = '/login'; } }}
                  className="bg-white/15 hover:bg-white/25 p-2 rounded-xl text-xs font-bold transition-colors"
                  title="تسجيل الخروج"
                >
                  🚪
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 relative z-10">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-700 shadow-md -translate-y-0.5'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 space-y-6 max-w-5xl mx-auto">
          {/* ─── OVERVIEW TAB ─── */}
          {activeTab === 'overview' && (
            <SafeErrorBoundary name="التبويب العام - نظرة عامة">
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">👥</span>
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{safeStats?.users?.verified || 0} موثق</span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold">إجمالي المستخدمين</p>
                    <p className="text-2xl font-black text-gray-800">{safeStats?.users?.total ?? safeUsers.length}</p>
                    <p className="text-[10px] mt-1 text-blue-600 font-bold">{safeStats?.users?.active ?? 0} نشط • {safeStats?.users?.suspended ?? 0} محظور</p>
                  </div>
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🏠</span>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{pendingProperties.length} معلق</span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold">إجمالي الإعلانات</p>
                    <p className="text-2xl font-black text-gray-800">{safeStats?.properties?.total ?? safeProperties.length}</p>
                    <p className="text-[10px] mt-1 text-blue-600 font-bold">{activeProperties.length} نشط • {rejectedProps.length} مرفوض</p>
                  </div>
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">💬</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{safeStats?.transactions?.count ?? 0} معاملة</span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold">المحادثات</p>
                    <p className="text-2xl font-black text-gray-800">{safeStats?.conversations ?? safeConversations.length}</p>
                    <p className="text-[10px] mt-1 text-amber-600 font-bold">حجم المعاملات: {(() => { try { const v = safeStats?.transactions?.total_volume; if (typeof v === 'number') return v.toLocaleString(); if (v != null) return String(v); return '0'; } catch { return '0'; } })()} ج.م</p>
                  </div>
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🚩</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (safeStats?.reports?.pending ?? pendingReportsCount) > 0
                          ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        {(safeStats?.reports?.pending ?? pendingReportsCount)} قيد المراجعة
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs font-bold">البلاغات</p>
                    <p className="text-2xl font-black text-gray-800">{safeStats?.reports?.total ?? safeReports.length}</p>
                    <p className="text-[10px] mt-1 text-purple-600 font-bold">{pendingVerificationsCount} طلب تحقق معلق</p>
                  </div>
                </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Recent Users */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">👥 أحدث المستخدمين</h3>
                  <button onClick={() => setActiveTab('users')} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">عرض الكل</button>
                </div>
                <div className="space-y-2">
                  {recentUsersView.map((u: any, idx: number) => {
                    const name = safeStr(u?.full_name, 'مستخدم');
                    const initial = name.trim().charAt(0) || '?';
                    const phone = safeStr(u?.phone, '—');
                    const createdAt = u?.created_at;
                    return (
                      <div key={safeNum(u?.id, idx) || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">{name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{phone}</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 shrink-0">{formatDate(createdAt)}</p>
                      </div>
                    );
                  })}
                  {recentUsersView.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">لا يوجد مستخدمين بعد</p>
                  )}
                </div>
              </div>

              {/* Recent Properties */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">🏠 أحدث الإعلانات</h3>
                  <button onClick={() => setActiveTab('properties')} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100">عرض الكل</button>
                </div>
                <div className="space-y-2">
                  {recentPropertiesView.map((p: any, idx: number) => {
                    const pObj = ensureObject(p);
                    const title = safeStr(pObj.description || pObj.type, 'إعلان');
                    const priceStr = safePrice(pObj.price);
                    const ownerName = safeStr(safeGet(pObj, 'owner.full_name'), '—');
                    const status = safeStr(pObj.status, 'pending');
                    const imageUrl = safeMediaUrl(pObj.media, 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200');
                    const statusLabel = status === 'active' ? 'نشط' : status === 'pending' ? 'معلق' : status === 'rejected' ? 'مرفوض' : status;
                    const statusClass = status === 'active' ? 'bg-green-100 text-green-700' : status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                    return (
                      <div key={safeNum(pObj.id, idx) || idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <img
                          src={imageUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-gray-200"
                          onError={(e) => { try { (e.currentTarget as any).src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'; } catch { /* ignore */ } }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-800 truncate">{title}</p>
                          <p className="text-[10px] text-blue-600 font-black">{priceStr} ج.م</p>
                          <p className="text-[10px] text-gray-400 truncate">المالك: {ownerName}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                  {recentPropertiesView.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">لا يوجد إعلانات بعد</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Notification Sender */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                <span>🔔</span> إرسال إشعار عام لجميع المستخدمين
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="عنوان الإشعار..."
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
                <textarea
                  placeholder="نص الإشعار..."
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-right"
                />
                <button
                  onClick={handleSendNotification}
                  disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-blue-500/20 text-sm"
                >
                  {notifSending ? 'جاري الإرسال...' : 'إرسال الإشعار للجميع 🚀'}
                </button>
              </div>
            </div>
              </div>
            </SafeErrorBoundary>
          )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-black text-gray-800 text-sm">إدارة المستخدمين ({filteredUsers.length})</h2>
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="🔍 بحث بالاسم/الهاتف/البريد/المدينة"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64 text-right"
                />
              </div>
            </div>

            {filteredUsers.map(u => (
              <div key={u.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-sm">
                      {(u.full_name || '?').trim().charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <h3 className="font-bold text-sm text-gray-800">{u.full_name}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          String(u.role).includes('Admin') || String(u.role) === 'Moderator'
                            ? 'bg-purple-100 text-purple-700'
                            : String(u.role) === 'Owner' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {u.role}
                        </span>
                        {u.is_verified && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ موثق</span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          u.status === 'active' ? 'bg-green-50 text-green-700'
                            : u.status === 'suspended' ? 'bg-red-50 text-red-700'
                              : 'bg-gray-50 text-gray-700'
                        }`}>
                          {u.status === 'active' ? 'نشط' : u.status === 'suspended' ? 'محظور' : u.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">{u.phone}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        📍 {[u.governorate, u.city, u.address].filter(Boolean).join(' - ') || 'لم يحدد الموقع'}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        انضم: {formatDate(u.created_at)} • إعلانات: {u._count?.properties ?? u.properties?.length ?? 0} • مفضلة: {u._count?.favorites ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="flex-1 bg-blue-50 text-blue-600 text-[11px] font-bold py-2 rounded-xl hover:bg-blue-100 transition-colors min-w-[70px]"
                  >
                    ✏️ تعديل
                  </button>
                  {String(u.role).includes('Admin') || String(u.role) === 'Moderator' ? (
                    <span className="flex-1 text-[10px] text-center text-gray-400 bg-gray-50 py-2 rounded-xl font-bold self-center">حساب إداري</span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleBanUser(u.id, u.status)}
                        disabled={actionLoading === `user-ban-${u.id}`}
                        className={`flex-1 text-[11px] font-bold py-2 rounded-xl transition-colors min-w-[70px] ${
                          u.status === 'active' ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        } disabled:opacity-50`}
                      >
                        {actionLoading === `user-ban-${u.id}` ? '...' : u.status === 'active' ? '🚫 حظر' : '✅ فك الحظر'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={actionLoading === `user-del-${u.id}`}
                        className="flex-1 bg-red-50 text-red-600 text-[11px] font-bold py-2 rounded-xl hover:bg-red-100 transition-colors min-w-[70px] disabled:opacity-50"
                      >
                        {actionLoading === `user-del-${u.id}` ? '...' : '🗑️ حذف'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && <p className="text-center text-gray-400 text-sm py-10 bg-white rounded-3xl border border-gray-100">لا يوجد مستخدمين مطابقين للبحث</p>}
          </div>
        )}

        {/* ─── PROPERTIES TAB ─── */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-black text-gray-800 text-sm">إدارة الإعلانات ({filteredProperties.length})</h2>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    value={propertySearch}
                    onChange={e => setPropertySearch(e.target.value)}
                    placeholder="🔍 بحث..."
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48 text-right"
                  />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="pending">معلق</option>
                    <option value="rejected">مرفوض</option>
                    <option value="sold">مباع</option>
                    <option value="rented">مؤجر</option>
                  </select>
                </div>
              </div>

              {selectedPropIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-bold text-blue-700">✓ تم اختيار {selectedPropIds.length} إعلان</span>
                  <div className="flex flex-wrap gap-1.5 mr-auto">
                    <button onClick={() => handleBulkStatus('active')} disabled={!!actionLoading} className="bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">قبول الكل</button>
                    <button onClick={() => handleBulkStatus('rejected')} disabled={!!actionLoading} className="bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50">رفض الكل</button>
                    <button onClick={() => handleBulkStatus('sold')} disabled={!!actionLoading} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50">كلها مباع</button>
                    <button onClick={() => { setSelectedPropIds([]); setSelectAll(false); }} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-300">إلغاء الاختيار</button>
                  </div>
                </div>
              )}
            </div>

            {filteredProperties.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-5xl block mb-3">🏠</span>
                <h4 className="font-bold text-gray-800">لا توجد إعلانات</h4>
                <p className="text-xs text-gray-400 mt-1">
                  {statusFilter !== 'all' || propertySearch ? 'جرب تغيير شروط البحث' : 'لم يتم إضافة إعلانات بعد — يمكنك استخدام زر مسح جميع الإعلانات من الإعدادات لإعادة البدء.'}
                </p>
              </div>
            )}

            {filteredProperties.length > 0 && (
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-600 mb-2">
                <label className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={e => { setSelectAll(e.target.checked); if (!e.target.checked) setSelectedPropIds([]); }}
                    className="w-4 h-4 rounded"
                  />
                  اختيار الكل
                </label>
                <span className="text-xs text-gray-400">{selectedPropIds.length} من {filteredProperties.length} محدد</span>
              </div>
            )}

            {filteredProperties.map(p => (
              <div key={p.id} className={`bg-white p-4 rounded-2xl shadow-sm border transition-all ${
                selectedPropIds.includes(p.id) ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-100'
              }`}>
                <div className="flex gap-3">
                  <div className="shrink-0 self-start">
                    <input
                      type="checkbox"
                      checked={selectedPropIds.includes(p.id)}
                      onChange={() => togglePropSelect(p.id)}
                      className="w-4 h-4 rounded mt-1"
                    />
                  </div>
                  <img
                    src={p.media?.[0]?.media_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
                    alt=""
                    className="w-20 h-20 rounded-xl object-cover shrink-0 bg-gray-200"
                    onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200')}
                  />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm text-gray-800 line-clamp-1 flex-1">{p.description || p.type}</h3>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg ${
                          p.status === 'active' ? 'bg-green-100 text-green-700'
                            : p.status === 'pending' ? 'bg-orange-100 text-orange-700'
                              : p.status === 'rejected' ? 'bg-red-100 text-red-700'
                                : p.status === 'sold' ? 'bg-purple-100 text-purple-700'
                                  : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {p.status === 'active' ? 'نشط' : p.status === 'pending' ? 'معلق' : p.status === 'rejected' ? 'مرفوض' : p.status === 'sold' ? 'مباع' : 'مؤجر'}
                        </span>
                        <div className="flex gap-1">
                          {p.is_featured && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg bg-amber-100 text-amber-700">⭐ مميز</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-600 font-black">
                      {Number(p.price || 0).toLocaleString('ar-EG')} ج.م {p.operation_type === 'rent' ? '/ شهر' : ''}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">
                      المالك: {p.owner?.full_name || '—'} • 📍 {[p.region, p.city].filter(Boolean).join('، ') || '—'} • {p.type} لل{p.operation_type === 'rent' ? 'إيجار' : 'بيع'}
                    </p>
                    <p className="text-[10px] text-gray-400">تاريخ النشر: {formatDate(p.created_at)} • 🔲 {p.area}م² • 🛏️ {p.rooms || 0} • 🛁 {p.bathrooms || 0}</p>

                    {p.status === 'rejected' && (
                      <div className="mt-2 p-2.5 bg-red-50 border border-red-100 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-red-600 flex items-center gap-1">
                            🚫 سبب الرفض:
                          </span>
                          <button
                            onClick={() => openEditRejectReason(p)}
                            className="text-[9px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-lg hover:bg-red-200 shrink-0"
                          >
                            ✏️ تعديل السبب
                          </button>
                        </div>
                        <p className="text-[11px] text-red-700 leading-snug pr-1">
                          {p.rejection_reason || 'لا يوجد سبب مذكور'}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50">
                      {p.status !== 'active' && (
                        <button onClick={() => handlePropertyStatus(p.id, 'active')} className="flex-1 bg-green-50 text-green-600 text-[10px] font-bold py-1.5 rounded-xl hover:bg-green-100 min-w-[60px]">قبول ✅</button>
                      )}
                      {p.status !== 'rejected' && (
                        <button onClick={() => handlePropertyStatus(p.id, 'rejected')} className="flex-1 bg-orange-50 text-orange-600 text-[10px] font-bold py-1.5 rounded-xl hover:bg-orange-100 min-w-[60px]">رفض ❌</button>
                      )}
                      <button onClick={() => handleToggleFeatured(p.id)} className={`flex-1 text-[10px] font-bold py-1.5 rounded-xl min-w-[60px] ${
                        p.is_featured ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}>
                        {p.is_featured ? 'إلغاء تمييز' : '⭐ تمييز'}
                      </button>
                      <button
                        onClick={() => handleDeleteProperty(p.id)}
                        disabled={actionLoading === `prop-del-${p.id}`}
                        className="flex-1 bg-red-50 text-red-600 text-[10px] font-bold py-1.5 rounded-xl hover:bg-red-100 min-w-[60px] disabled:opacity-50"
                      >
                        {actionLoading === `prop-del-${p.id}` ? '...' : '🗑️ حذف'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── REPORTS TAB ─── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-black text-gray-800 text-sm">البلاغات ({filteredReports.length})</h2>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'pending', 'reviewed', 'resolved'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReportFilter(f)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors ${
                      reportFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {f === 'all' ? 'الكل' : f === 'pending' ? 'قيد المراجعة' : f === 'reviewed' ? 'تمت المراجعة' : 'تم الحل'}
                  </button>
                ))}
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-5xl block mb-3">✨</span>
                <h4 className="font-bold text-gray-800 text-sm">لا توجد بلاغات {reportFilter === 'all' ? '' : 'في هذه الفئة'}</h4>
                <p className="text-xs text-gray-400 mt-1">كل شيء يسير على ما يرام</p>
              </div>
            ) : (
              filteredReports.map(r => (
                <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-red-50 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">بلاغ #{r.id}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                        r.status === 'pending' ? 'bg-orange-100 text-orange-700'
                          : r.status === 'reviewed' ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {r.status === 'pending' ? '⏳ قيد المراجعة' : r.status === 'reviewed' ? '👀 تمت المراجعة' : '✅ تم الحل'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">{formatDate(r.created_at)}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 p-3 bg-gray-50 rounded-xl">{r.reason}</p>
                  <div className="text-[11px] bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p>مُقدم البلاغ: <span className="font-bold text-blue-700">{r.reporter?.full_name || '—'}</span> <span className="font-mono text-gray-500">({r.reporter?.phone || r.reporter?.email || ''})</span></p>
                    {r.reported_user && <p>المبلغ ضده: <span className="font-bold text-red-700">{r.reported_user.full_name}</span> <span className="font-mono text-gray-500">({r.reported_user.phone || ''})</span></p>}
                    {r.property && <p>العقار: <span className="font-bold">{r.property.type}</span> — {r.property.description?.slice?.(0, 30)} — <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded ${
                      r.property.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{r.property.status}</span></p>}
                    {r.admin_notes && <p>ملاحظات الإدارة: <span className="font-bold text-purple-700">{r.admin_notes}</span></p>}
                  </div>
                  <div className="flex gap-2 flex-wrap pt-1">
                    {r.property?.id && (
                      <button onClick={() => router.push(`/properties/${r.property.id}`)} className="flex-1 text-blue-600 text-[11px] font-bold py-2 rounded-xl bg-blue-50 hover:bg-blue-100">
                        عرض العقار ←
                      </button>
                    )}
                    {r.status !== 'reviewed' && (
                      <button onClick={() => handleResolveReport(r.id, 'reviewed')} className="flex-1 text-blue-700 text-[11px] font-bold py-2 rounded-xl bg-blue-50 hover:bg-blue-100">
                        وضع قيد المراجعة
                      </button>
                    )}
                    {r.status !== 'resolved' && (
                      <button onClick={() => handleResolveReport(r.id, 'resolved')} className="flex-1 text-green-700 text-[11px] font-bold py-2 rounded-xl bg-green-50 hover:bg-green-100">
                        ✅ تم الحل
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── VERIFICATIONS TAB ─── */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="font-black text-gray-800 text-sm">طلبات التحقق من الهوية ({verifications.length})</h2>
            </div>
            {verifications.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-5xl block mb-3">📝</span>
                <h4 className="font-bold text-gray-800 text-sm">لا توجد طلبات تحقق</h4>
                <p className="text-xs text-gray-400 mt-1">سيتم عرض طلبات المستخدمين للتحقق من هويتهم هنا.</p>
              </div>
            ) : (
              verifications.map(v => (
                <div key={v.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-base font-black shadow-sm">
                        {(v.user?.full_name || '?').charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-gray-800">{v.user?.full_name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono">{v.user?.phone} • {v.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.user?.is_verified && <span className="text-[9px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-lg">✓ موثوق حالياً</span>}
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg ${
                        v.status === 'pending' ? 'bg-orange-100 text-orange-700'
                          : v.status === 'approved' ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {v.status === 'pending' ? 'معلق' : v.status === 'approved' ? 'موافق عليه' : 'مرفوض'}
                      </span>
                    </div>
                  </div>
                  {v.document_url && (
                    <a
                      href={v.document_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-[11px] text-blue-600 font-bold p-3 bg-blue-50 rounded-xl text-center hover:bg-blue-100 border border-blue-100"
                    >
                      📄 عرض المستند
                    </a>
                  )}
                  <p className="text-[10px] text-gray-400 text-center">تاريخ الطلب: {formatDate(v.created_at)}{v.reviewed_by ? ` • تمت المراجعة بواسطة #${v.reviewed_by}` : ''}</p>
                  {v.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleApproveVerification(v.id)} className="flex-1 bg-green-600 text-white text-[11px] font-bold py-2.5 rounded-xl hover:bg-green-700 shadow-sm">✅ قبول و تفعيل التوثيق</button>
                      <button onClick={() => handleRejectVerification(v.id)} className="flex-1 bg-red-50 text-red-600 text-[11px] font-bold py-2.5 rounded-xl hover:bg-red-100 border border-red-100">❌ رفض الطلب</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── CONVERSATIONS TAB ─── */}
        {activeTab === 'conversations' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="font-black text-gray-800 text-sm">سجل المحادثات ({conversations.length})</h2>
            </div>
            {conversations.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <span className="text-5xl block mb-3">💬</span>
                <h4 className="font-bold text-gray-800 text-sm">لا توجد محادثات بعد</h4>
                <p className="text-xs text-gray-400 mt-1">تظهر محادثات المستخدمين حول العقارات هنا.</p>
              </div>
            ) : (
              conversations.map(c => (
                <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2 flex-wrap">
                        📩 محادثة #{c.id}
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {c._count?.messages ?? 0} رسالة
                        </span>
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        🗓️ {formatDate(c.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                      <p className="text-[10px] text-blue-500 font-bold mb-0.5">المالك</p>
                      <p className="font-bold text-gray-800 truncate">{c.owner?.full_name || '—'}</p>
                      <p className="font-mono text-gray-500 text-[10px]">{c.owner?.phone || ''}</p>
                    </div>
                    <div className="bg-green-50 p-2.5 rounded-xl border border-green-100">
                      <p className="text-[10px] text-green-600 font-bold mb-0.5">المشتري / المستأجر</p>
                      <p className="font-bold text-gray-800 truncate">{c.buyer?.full_name || '—'}</p>
                      <p className="font-mono text-gray-500 text-[10px]">{c.buyer?.phone || ''}</p>
                    </div>
                  </div>
                  {c.property && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2.5">
                      <div className="text-xs font-bold text-gray-400 shrink-0">عن العقار:</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-800 truncate">
                          {c.property.type} — {c.property.description?.slice?.(0, 50)}
                        </p>
                        <p className="text-[10px] text-blue-600 font-black mt-0.5">
                          {Number(c.property.price || 0).toLocaleString()} ج.م
                        </p>
                      </div>
                    </div>
                  )}
                  {c.messages?.[0] && (
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-indigo-500 font-bold">آخر رسالة</span>
                        <span className="text-[10px] text-gray-400">{formatDate(c.messages[0].created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2">{c.messages[0].content}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                ⚙️ إعدادات المنصة وإجراءات عامة
              </h3>

              {/* Quick Notification */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3">
                <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  🔔 إرسال إشعار جماعي
                </h4>
                <input
                  type="text"
                  placeholder="عنوان الإشعار..."
                  value={notifTitle}
                  onChange={e => setNotifTitle(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
                <textarea
                  placeholder="نص الإشعار..."
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-right"
                />
                <button
                  onClick={handleSendNotification}
                  disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {notifSending ? 'جاري الإرسال...' : 'إرسال الإشعار للجميع 🚀'}
                </button>
              </div>

              {/* Danger Zone - Wipe All */}
              <div className="p-4 rounded-2xl bg-red-50 border-2 border-red-100 space-y-3">
                <h4 className="font-black text-sm text-red-700 flex items-center gap-2">
                  ⚠️ منطقة الخطر — إجراءات لا يمكن التراجع عنها
                </h4>
                <div className="bg-white p-3 rounded-xl border border-red-200 space-y-2">
                  <h5 className="font-bold text-xs text-gray-800">🗑️ مسح جميع الإعلانات من قاعدة البيانات</h5>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    سيتم حذف <strong>كل</strong> ما يلي نهائياً:<br />
                    • جميع الإعلانات ({properties.length})<br />
                    • جميع الصور والوسائط المرتبطة بها<br />
                    • جميع المفضلة المرتبطة بالإعلانات<br />
                    • جميع المحادثات والرسائل ({conversations.length})<br />
                    • جميع البلاغات المرتبطة بالإعلانات<br />
                    • جميع المعاملات والمدفوعات
                  </p>
                  <p className="text-[11px] text-red-600 font-bold">
                    لن يتم حذف حسابات المستخدمين. فقط البيانات المتعلقة بالإعلانات.
                  </p>
                  <div className="pt-2 space-y-2">
                    <label className="text-[11px] font-bold text-gray-700 block">
                      للتأكيد، اكتب <span className="font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">WIPE_ALL_PROPERTIES</span> في الحقل التالي:
                    </label>
                    <input
                      type="text"
                      value={wipeConfirm}
                      onChange={e => setWipeConfirm(e.target.value)}
                      placeholder="WIPE_ALL_PROPERTIES"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-500 text-center"
                    />
                    <button
                      onClick={handleWipeAll}
                      disabled={wipeLoading || wipeConfirm !== 'WIPE_ALL_PROPERTIES'}
                      className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md shadow-red-500/20"
                    >
                      {wipeLoading ? '⏳ جاري المسح...' : '⚠️ مسح جميع الإعلانات نهائياً — هيا نبدأ من جديد'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <h4 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  📈 ملخص الحالة الحالية للمنصة
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-400">إجمالي المستخدمين</p>
                    <p className="text-lg font-black text-gray-800">{users.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-400">المستخدمين الموثوقين</p>
                    <p className="text-lg font-black text-green-600">{verifiedUsers.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-400">إجمالي الإعلانات</p>
                    <p className="text-lg font-black text-gray-800">{properties.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-400">الإعلانات النشطة</p>
                    <p className="text-lg font-black text-blue-600">{activeProperties.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-400">المحادثات</p>
                    <p className="text-lg font-black text-indigo-600">{conversations.length}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                    <p className="text-gray-400">البلاغات المعلقة</p>
                    <p className="text-lg font-black text-red-600">{reports.filter(r => r.status === 'pending').length}</p>
                  </div>
                </div>
                <button
                  onClick={fetchAllAdminData}
                  className="w-full bg-slate-700 text-white text-[11px] font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors mt-2"
                >
                  🔄 تحديث الملخص من قاعدة البيانات
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Edit Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800">تعديل بيانات المستخدم #{editingUser.id}</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">الاسم الكامل</label>
                <input
                  type="text"
                  value={editingUser.full_name || ''}
                  onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editingUser.phone || ''}
                  onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">الحالة</label>
                  <select
                    value={editingUser.status || 'active'}
                    onChange={e => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">نشط</option>
                    <option value="suspended">محظور</option>
                    <option value="deleted">محذوف</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">التحقق</label>
                  <select
                    value={editingUser.is_verified ? 'yes' : 'no'}
                    onChange={e => setEditingUser({ ...editingUser, is_verified: e.target.value === 'yes' })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="no">غير موثق</option>
                    <option value="yes">موثق ✓</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">المحافظة</label>
                <input
                  type="text"
                  value={editingUser.governorate || ''}
                  onChange={e => setEditingUser({ ...editingUser, governorate: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  placeholder="الفيوم"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">المدينة / المركز</label>
                <input
                  type="text"
                  value={editingUser.city || ''}
                  onChange={e => setEditingUser({ ...editingUser, city: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  placeholder="مدينة الفيوم"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">العنوان</label>
                <input
                  type="text"
                  value={editingUser.address || ''}
                  onChange={e => setEditingUser({ ...editingUser, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleUpdateUser}
                disabled={actionLoading === 'user-edit'}
                className="flex-1 bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'user-edit' ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Property Reject Modal */}
      {rejectModal.propertyId !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !rejectModal.submitting && setRejectModal({ propertyId: null, reason: '', submitting: false })}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                🚫 رفض الإعلان #{rejectModal.propertyId}
              </h3>
              <button
                onClick={() => !rejectModal.submitting && setRejectModal({ propertyId: null, reason: '', submitting: false })}
                className="text-gray-400 hover:text-gray-600 text-xl shrink-0"
                disabled={rejectModal.submitting}
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              سيتم إخفاء هذا الإعلان عن جميع المستخدمين، وسيظهر المالك سبب الرفض فقط.
            </p>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">سبب الرفض (سيظهر لمالك الإعلان):</label>
              <textarea
                value={rejectModal.reason}
                onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
                placeholder="مثال: الصور غير واضحة، البيانات غير مكتملة، السعر غير منطقي، مخالفة لشروط المنصة..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-right resize-none h-32"
                disabled={rejectModal.submitting}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => !rejectModal.submitting && setRejectModal({ propertyId: null, reason: '', submitting: false })}
                disabled={rejectModal.submitting}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={submitSingleReject}
                disabled={rejectModal.submitting}
                className="flex-1 bg-orange-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {rejectModal.submitting ? '⏳ جاري الرفض...' : '🚫 تأكيد الرفض مع السبب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reject Modal */}
      {bulkRejectModal.open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !bulkRejectModal.submitting && setBulkRejectModal({ open: false, reason: '', submitting: false })}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                🚫 رفض {selectedPropIds.length} إعلان مختارة
              </h3>
              <button
                onClick={() => !bulkRejectModal.submitting && setBulkRejectModal({ open: false, reason: '', submitting: false })}
                className="text-gray-400 hover:text-gray-600 text-xl shrink-0"
                disabled={bulkRejectModal.submitting}
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              سيتم رفض جميع الإعلانات المختارة بنفس السبب التالي:
            </p>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">سبب الرفض:</label>
              <textarea
                value={bulkRejectModal.reason}
                onChange={e => setBulkRejectModal(m => ({ ...m, reason: e.target.value }))}
                placeholder="مثال: البيانات غير مكتملة، مخالفة لشروط المنصة..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-right resize-none h-28"
                disabled={bulkRejectModal.submitting}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => !bulkRejectModal.submitting && setBulkRejectModal({ open: false, reason: '', submitting: false })}
                disabled={bulkRejectModal.submitting}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={submitBulkReject}
                disabled={bulkRejectModal.submitting}
                className="flex-1 bg-orange-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {bulkRejectModal.submitting ? '⏳ جاري التنفيذ...' : '🚫 رفض الكل بالسبب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reject Reason Modal */}
      {editRejectReason.propertyId !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => !editRejectReason.submitting && setEditRejectReason({ propertyId: null, reason: '', submitting: false })}
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                ✏️ تعديل سبب الرفض للإعلان #{editRejectReason.propertyId}
              </h3>
              <button
                onClick={() => !editRejectReason.submitting && setEditRejectReason({ propertyId: null, reason: '', submitting: false })}
                className="text-gray-400 hover:text-gray-600 text-xl shrink-0"
                disabled={editRejectReason.submitting}
              >
                ✕
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">السبب الجديد (سيظهر لمالك الإعلان):</label>
              <textarea
                value={editRejectReason.reason}
                onChange={e => setEditRejectReason(m => ({ ...m, reason: e.target.value }))}
                placeholder="اكتب سبب الرفض هنا..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-right resize-none h-32"
                disabled={editRejectReason.submitting}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => !editRejectReason.submitting && setEditRejectReason({ propertyId: null, reason: '', submitting: false })}
                disabled={editRejectReason.submitting}
                className="flex-1 bg-gray-100 text-gray-700 font-bold text-sm py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={submitEditRejectReason}
                disabled={editRejectReason.submitting}
                className="flex-1 bg-purple-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {editRejectReason.submitting ? '⏳ جاري الحفظ...' : '💾 حفظ التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </SafeErrorBoundary>
  );
}
