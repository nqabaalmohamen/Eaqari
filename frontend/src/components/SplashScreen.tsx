'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'enter' | 'expand' | 'logo' | 'text' | 'dots' | 'exit'>('enter');

  useEffect(() => {
    // Cinematic timing sequence
    const t0 = setTimeout(() => setPhase('expand'), 100);
    const t1 = setTimeout(() => setPhase('logo'), 600);
    const t2 = setTimeout(() => setPhase('text'), 1400);
    const t3 = setTimeout(() => setPhase('dots'), 2200);
    const t4 = setTimeout(() => setPhase('exit'), 4500);
    const t5 = setTimeout(() => onFinish(), 5000);

    return () => {
      clearTimeout(t0);
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
          transition: 'opacity 0.6s ease-out'
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-white">
      
      {/* Soft Elegant Background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 40%, rgba(201,168,76,0.08) 0%, rgba(255,255,255,1) 70%)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'opacity 1.5s ease-in',
        }}
      />

      {/* Cinematic Starfield / Dust particles in Gold */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${Math.random() * 4 + 1}px`,
              height: `${Math.random() * 4 + 1}px`,
              backgroundColor: '#c9a84c',
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5,
              animation: `floatParticle ${Math.random() * 5 + 3}s linear infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Logo Container */}
      <div
        className="flex flex-col items-center z-10"
        style={{
          transform: phase === 'enter' || phase === 'expand' 
            ? 'scale(0) translateY(50px)' 
            : phase === 'logo' 
              ? 'scale(1.1) translateY(0)'
              : 'scale(1) translateY(-20px)',
          opacity: phase === 'enter' ? 0 : 1,
          transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="relative">
          {/* Intense Glow (Gold) */}
          <div 
            className="absolute inset-0 blur-[50px] rounded-full"
            style={{
              backgroundColor: '#c9a84c',
              opacity: phase === 'logo' || phase === 'text' || phase === 'dots' ? 0.3 : 0,
              transition: 'opacity 2s ease',
            }}
          />
          <img
            src="/logo.png"
            alt="عقاري"
            className="w-56 h-56 object-contain relative z-10 drop-shadow-xl"
          />
        </div>

        {/* Text Container with Cinematic Reveal */}
        <div
          className="text-center mt-6 overflow-hidden"
          style={{ height: '80px' }}
        >
          <div
            style={{
              transform: phase === 'text' || phase === 'dots' ? 'translateY(0)' : 'translateY(100%)',
              opacity: phase === 'text' || phase === 'dots' ? 1 : 0,
              transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <h1 className="text-4xl font-black text-gray-900 tracking-wider mb-2">عقاري</h1>
            <div className="h-[2px] w-0 mx-auto mb-2" 
                 style={{
                   background: 'linear-gradient(to right, transparent, #c9a84c, transparent)',
                   width: phase === 'text' || phase === 'dots' ? '100%' : '0%',
                   transition: 'width 1s ease 0.5s',
                 }}
            />
            <p className="text-[#c9a84c] text-xs tracking-[0.4em] uppercase font-black">
              البوابة الأولى للعقارات
            </p>
          </div>
        </div>
      </div>

      {/* Cinematic Loading Line (Gold) */}
      <div
        className="absolute bottom-12 w-64 z-10 flex justify-center"
        style={{
          opacity: phase === 'dots' ? 1 : 0,
          transform: phase === 'dots' ? 'scaleX(1)' : 'scaleX(0)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="relative w-full h-[3px] bg-gray-200 overflow-hidden rounded-full">
          <div
            className="absolute top-0 bottom-0 left-0"
            style={{
              background: 'linear-gradient(to right, #c9a84c, #f0d080, #c9a84c)',
              width: phase === 'dots' ? '100%' : '0%',
              transition: 'width 2.2s cubic-bezier(0.75, 0, 0.25, 1)',
            }}
          />
          <div 
             className="absolute top-0 bottom-0 bg-white w-8 blur-[4px]"
             style={{
               left: phase === 'dots' ? '100%' : '-10%',
               transition: 'left 2.2s cubic-bezier(0.75, 0, 0.25, 1)',
             }}
          />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatParticle {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(-100px) rotate(360deg); opacity: 0; }
        }
      `}} />
    </div>
  );
}
