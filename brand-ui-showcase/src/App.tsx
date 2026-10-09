import React, { useState } from 'react';
import { BrandKit } from './components/BrandKit';
import { UIKit } from './components/UIKit';
import { ProductSurfaces } from './components/ProductSurfaces';
import { Sparkles, Palette, Layers, Layout, Moon, Sun, BookOpen, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeNav, setActiveNav] = useState<'brand' | 'ui' | 'surfaces'>('brand');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#F0F1F5] dark:bg-[#0A0E15] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans antialiased">
        {/* Top Floating App Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-[#0A0E15]/80 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#325FEC] to-[#518FFF] flex items-center justify-center text-white font-extrabold shadow-[0_0_12px_rgba(81,143,255,0.4)]">
                R
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-tight">Researchie</span>
                <span className="text-[10px] font-mono text-[#518FFF] bg-[#518FFF]/10 px-1.5 py-0.5 rounded ml-2 font-bold">
                  Design System v2.0
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 dark:bg-[#202531] p-1 rounded-2xl gap-1">
              <button
                onClick={() => setActiveNav('brand')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'brand'
                    ? 'bg-white dark:bg-[#325FEC] text-black dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Palette size={13} />
                <span>Brand Kit & Optical Depth</span>
              </button>

              <button
                onClick={() => setActiveNav('ui')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'ui'
                    ? 'bg-white dark:bg-[#325FEC] text-black dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>UI Kit & Grayscale Matrix</span>
              </button>

              <button
                onClick={() => setActiveNav('surfaces')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'surfaces'
                    ? 'bg-white dark:bg-[#325FEC] text-black dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Layout size={13} />
                <span>Where What Applies (3 Tiers)</span>
              </button>
            </div>

            {/* Dark/Light Toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-[#202531] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:scale-105 transition-transform cursor-pointer"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="max-w-7xl mx-auto px-6 py-10">
          {activeNav === 'brand' && <BrandKit isDark={isDarkMode} />}
          {activeNav === 'ui' && <UIKit isDark={isDarkMode} />}
          {activeNav === 'surfaces' && <ProductSurfaces isDark={isDarkMode} />}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500">
          <p>
            Researchie Canonical Design Language · Grounded by <code className="font-mono text-[#518FFF]">DESIGN_SYSTEM.md</code>
          </p>
        </footer>
      </div>
    </div>
  );
}
