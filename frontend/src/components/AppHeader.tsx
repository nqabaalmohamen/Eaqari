'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function AppHeader() {
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
        </Link>
      </div>
    </header>
  );
}
