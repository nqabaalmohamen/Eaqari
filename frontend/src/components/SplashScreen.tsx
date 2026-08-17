'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'logo' | 'text' | 'dots' | 'exit'>('enter');

  useEffect(() => {
    // Elegant timing sequence
    const t1 = setTimeout(() => setPhase('logo'), 100);
    const t2 = setTimeout(() => setPhase('text'), 800);
    const t3 = setTimeout(() => setPhase('dots'), 1500);
    const t4 = setTimeout(() => setPhase('exit'), 3000);
    const t5 = setTimeout(() => onFinish(), 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onFinish]);

  if (phase === 'exit') {
    return (
      <div 
        className="fixed inset-0 z-50 bg-white"
        style={{
          opacity: 0,
          transition: 'opacity 0.5s ease-out'
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-white">
      {/* Background with subtle elegant gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
        }}
      />

      {/* Floating abstract luxury elements (very subtle in background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${[120, 80, 160, 60, 100][i]}px`,
              height: `${[120, 80, 160, 60, 100][i]}px`,
              top: `${[10, 70, 20, 80, 5][i]}%`,
              left: `${[80, 10, 60, 70, 30][i]}%`,
              background: i % 2 === 0 ? 'rgba(201,168,76,0.03)' : 'rgba(0,0,0,0.02)',
              animation: `floatBubble ${5 + i}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Elegant top line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)',
          opacity: phase === 'logo' || phase === 'text' || phase === 'dots' ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Logo Container */}
      <div
        className="flex flex-col items-center z-10"
        style={{
          transform: phase === 'enter' ? 'scale(0.85) translateY(20px)' : 'scale(1) translateY(0)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
      >
        <div 
          className="relative"
          style={{
            filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.08))',
          }}
        >
          {/* Subtle glow behind logo */}
          <div className="absolute inset-0 bg-white blur-xl rounded-full opacity-60" />
          
          <img
            src="/logo.png"
            alt="عقاري"
            className="w-56 h-56 object-contain relative z-10"
          />
        </div>

        {/* App Name / Slogan */}
        <div
          className="text-center mt-4"
          style={{
            opacity: phase === 'text' || phase === 'dots' ? 1 : 0,
            transform: phase === 'text' || phase === 'dots' ? 'translateY(0)' : 'translateY(15px)',
            transition: 'all 0.6s ease',
          }}
        >
          <h1 className="text-3xl font-black text-gray-800 tracking-tight drop-shadow-sm mb-1">عقاري</h1>
          <p className="text-gray-400 text-xs tracking-[0.2em] uppercase font-bold">
            منصة العقارات الأولى
          </p>
        </div>
      </div>

      {/* Loading Bar */}
      <div
        className="absolute bottom-16 w-48 z-10"
        style={{
          opacity: phase === 'dots' ? 1 : 0,
          transform: phase === 'dots' ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.5s ease',
        }}
      >
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #c9a84c, #f0d080, #c9a84c)',
              backgroundSize: '200% 100%',
              width: phase === 'dots' ? '100%' : '0%',
              transition: 'width 1.5s cubic-bezier(0.25, 1, 0.5, 1)',
              animation: 'shimmerBg 2s infinite linear'
            }}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatBubble {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes shimmerBg {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}} />
    </div>
  );
}
