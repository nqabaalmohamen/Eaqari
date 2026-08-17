import Link from 'next/link';

export default function About() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">من نحن - عقاري</h1>
        <p className="text-xl text-gray-600">منصة عقاري هي الأولى من نوعها التي تربط بين البائع والمشتري مباشرة بدون وسطاء.</p>
        <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
          العودة للرئيسية
        </Link>
      </div>
    </main>
  );
}
