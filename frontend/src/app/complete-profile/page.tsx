"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession, saveSession } from "@/utils/auth";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const { user: sessionUser } = getSession();
    if (!sessionUser) {
      router.replace("/login");
    } else if (sessionUser.phone) {
      router.replace("/");
    } else {
      setUser(sessionUser);
      if (sessionUser.full_name && !sessionUser.full_name.includes("Google User")) {
        setFullName(sessionUser.full_name);
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) {
      setError("الاسم ورقم الهاتف مطلوبين");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch("https://eaqari.vercel.app/api/users/profile-completion", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user?.email,
          full_name: fullName,
          phone,
          governorate,
          city,
          address
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "حدث خطأ");
      }

      // Update local storage user session
      const { token } = getSession();
      if (token) {
        saveSession(token, { ...user, ...data.user });
      }

      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.phone) return null; // Wait for effect to redirect

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">استكمال البيانات</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">
          أهلاً بك في عقاري! يرجى استكمال بياناتك لمرة واحدة فقط لتتمكن من استخدام التطبيق.
        </p>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm mb-4 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم باللغة العربية *</label>
            <input
              placeholder="مثال: أحمد محمد"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف للتواصل *</label>
            <input
              type="tel"
              placeholder="مثال: 01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المحافظة</label>
            <input
              placeholder="مثال: الفيوم"
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدينة أو المركز</label>
            <input
              placeholder="مثال: يوسف الصديق"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
            <input
              placeholder="الشارع، المنطقة، رقم العمارة"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:border-blue-400"
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60" disabled={loading}>
            {loading ? "جاري الحفظ..." : "حفظ والمتابعة"}
          </button>
        </form>
      </div>
    </div>
  );
}
