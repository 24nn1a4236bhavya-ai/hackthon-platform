import React from 'react';
import { Layers, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-10 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center text-white">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-slate-200">OpenHack Platform</span>
          <span className="text-slate-500">•</span>
          <span>Open-Source (MIT License)</span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Offline & Self-Hostable</span>
          </div>
          <span className="text-slate-600">|</span>
          <span>Docker Ready (`docker compose up`)</span>
        </div>
      </div>
    </footer>
  );
};
