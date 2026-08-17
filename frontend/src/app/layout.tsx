import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import ClientLayout from "@/components/ClientLayout";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "عقاري | Eaqari",
  description: "المنصة العقارية الأولى التي تربط البائع بالمشتري مباشرة بدون وسيط أو عمولات خفية.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-cairo bg-gray-50 text-gray-900">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
