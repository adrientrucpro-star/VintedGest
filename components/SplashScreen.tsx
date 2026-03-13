
import React, { useEffect, useState } from 'react';
import { Package, Sparkles, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  isVisible: boolean;
  statusMessage?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible, statusMessage }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 90) return 90; // Hold at 90% until actually done
          return p + Math.random() * 15;
        });
      }, 400);
      return () => clearInterval(interval);
    } else {
      setProgress(100);
    }
  }, [isVisible]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-all duration-300 ease-in-out ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none scale-105 blur-md'
      }`}
    >
      <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
        {/* Logo Container - Matching App Style */}
        <div className="relative mb-10 group">
          <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-10 rounded-full animate-pulse" />
          <div className="relative w-24 h-24 bg-blue-600 rounded-[2.5rem] shadow-2xl shadow-blue-600/20 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
            <Package size={44} className="text-white relative z-10" strokeWidth={1.5} />
            <Sparkles size={18} className="text-blue-200 absolute top-6 right-6 z-10 animate-pulse" />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2 mb-12 w-full">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Vinted Manager
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.25em]">
            Assistant Intelligent
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="w-full flex flex-col items-center gap-5">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={14} className="animate-spin" />
            <p className="text-xs font-bold tracking-wide">
              {statusMessage || 'Chargement des données...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
