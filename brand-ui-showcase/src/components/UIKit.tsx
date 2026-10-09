import React, { useState } from 'react';
import { Copy, Check, Search, Command, ArrowRight, Sparkles, Loader2, Bookmark, Layers, Quote, Shield, AlertCircle } from 'lucide-react';

export const UIKit: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [btnLoading, setBtnLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHex(text);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const whiteGrays = [
    { name: 'White 100', hex: '#FFFFFF', role: 'Card Surfaces, Modals, Sheets', text: '#0A0E15', border: 'border-slate-300' },
    { name: 'White 90', hex: '#F0F1F5', role: 'Main Canvas, App Background', text: '#0A0E15', border: 'border-slate-300' },
    { name: 'White 80', hex: '#E0E4EB', role: 'Inputs, Inactive Filter Tabs', text: '#0A0E15', border: 'border-slate-400' },
    { name: 'White 70', hex: '#D1D6E0', role: 'Default Component Borders, Lines', text: '#0A0E15', border: 'border-slate-400' },
    { name: 'White 60', hex: '#BFC6D4', role: 'Hover Borders, Subtle Icons', text: '#0A0E15', border: 'border-slate-500' },
  ];

  const blackGrays = [
    { name: 'Black 60', hex: '#667085', role: 'Muted Dark Text, Inactive Icons', text: '#FFFFFF', border: 'border-slate-600' },
    { name: 'Black 70', hex: '#4E5766', role: 'Dark Component Borders, Keylines', text: '#FFFFFF', border: 'border-slate-700' },
    { name: 'Black 80', hex: '#37404F', role: 'Secondary Dark Cards, Active Rows', text: '#FFFFFF', border: 'border-slate-700' },
    { name: 'Black 90', hex: '#202531', role: 'Primary Dark Cards, Command Bars', text: '#FFFFFF', border: 'border-slate-800' },
    { name: 'Black 100', hex: '#0A0E15', role: 'Main Dark Canvas, Side Panel BG', text: '#FFFFFF', border: 'border-slate-900' },
  ];

  return (
    <div className="space-y-16">
      {/* 1. Systematic Dual Grayscale Matrix (uxdam reproduction) */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#325FEC]"></span>
            <h2 className="text-xl font-extrabold tracking-tight">1. Dual Grayscale Matrix (uxdam Standard)</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Exact 5-step calibrated slate ramps for Light Mode (White 60–100) and Dark Mode (Black 60–100).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A0E15]">
          {/* Light Mode Grays */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Light Mode Grays</span>
              <span className="text-xs font-mono text-slate-400">Canvas: #F0F1F5</span>
            </div>
            {whiteGrays.map((g) => (
              <div
                key={g.name}
                onClick={() => copyToClipboard(g.hex)}
                className={`flex items-center justify-between p-4 rounded-2xl border ${g.border} shadow-sm cursor-pointer transition-all hover:scale-[1.01]`}
                style={{ backgroundColor: g.hex, color: g.text }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold">{g.name}</span>
                    <span className="text-[10.5px] font-mono opacity-70">({g.hex})</span>
                  </div>
                  <p className="text-[11px] font-medium opacity-80 mt-0.5">{g.role}</p>
                </div>
                <button className="text-xs p-1 rounded bg-black/5 hover:bg-black/10">
                  {copiedHex === g.hex ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>

          {/* Dark Mode Grays */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Dark Mode Grays</span>
              <span className="text-xs font-mono text-slate-400">Canvas: #0A0E15</span>
            </div>
            {blackGrays.map((g) => (
              <div
                key={g.name}
                onClick={() => copyToClipboard(g.hex)}
                className={`flex items-center justify-between p-4 rounded-2xl border ${g.border} shadow-sm cursor-pointer transition-all hover:scale-[1.01]`}
                style={{ backgroundColor: g.hex, color: g.text }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold">{g.name}</span>
                    <span className="text-[10.5px] font-mono opacity-70">({g.hex})</span>
                  </div>
                  <p className="text-[11px] font-medium opacity-80 mt-0.5">{g.role}</p>
                </div>
                <button className="text-xs p-1 rounded bg-white/10 hover:bg-white/20">
                  {copiedHex === g.hex ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Button Architecture & States */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#325FEC]" />
            <h2 className="text-xl font-extrabold tracking-tight">2. Button & Action States</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Standardized interactive elements with high-contrast feedback states.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] p-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[10.5px]">
                <th className="pb-3">Variant</th>
                <th className="pb-3">Default</th>
                <th className="pb-3">Hover</th>
                <th className="pb-3">Active / Pressed</th>
                <th className="pb-3">Disabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Primary Royal Blue */}
              <tr className="py-4">
                <td className="py-4 font-bold text-slate-900 dark:text-slate-100">Primary Solid</td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-[#325FEC] text-white font-bold shadow-sm cursor-pointer">
                    Save to Project
                  </button>
                </td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-[#254ECD] text-white font-bold shadow-md -translate-y-0.5 cursor-pointer">
                    Save to Project
                  </button>
                </td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-[#1D3FA8] text-white font-bold scale-[0.98] cursor-pointer">
                    Save to Project
                  </button>
                </td>
                <td>
                  <button disabled className="px-4 py-2 rounded-xl bg-[#325FEC]/40 text-white/60 font-bold cursor-not-allowed">
                    Save to Project
                  </button>
                </td>
              </tr>

              {/* Luminous Specular Glow (Marketing/High-Impact) */}
              <tr className="py-4">
                <td className="py-4 font-bold text-slate-900 dark:text-slate-100">Luminous Glow</td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#325FEC] to-[#518FFF] text-white font-bold shadow-[0_0_16px_rgba(81,143,255,0.4)] border border-white/30 cursor-pointer">
                    Synthesize Notes
                  </button>
                </td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#325FEC] to-[#518FFF] text-white font-bold shadow-[0_0_24px_rgba(81,143,255,0.65)] border border-white/50 -translate-y-0.5 cursor-pointer">
                    Synthesize Notes
                  </button>
                </td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#254ECD] to-[#3B82F6] text-white font-bold scale-[0.98] cursor-pointer">
                    Synthesize Notes
                  </button>
                </td>
                <td>
                  <button disabled className="px-4 py-2 rounded-xl bg-slate-800 text-slate-500 font-bold cursor-not-allowed border border-slate-700">
                    Synthesize Notes
                  </button>
                </td>
              </tr>

              {/* Secondary Ghost */}
              <tr className="py-4">
                <td className="py-4 font-bold text-slate-900 dark:text-slate-100">Secondary Slate</td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#202531] text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700 cursor-pointer">
                    Export Markdown
                  </button>
                </td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-[#37404F] text-black dark:text-white font-bold border border-slate-300 dark:border-slate-600 cursor-pointer">
                    Export Markdown
                  </button>
                </td>
                <td>
                  <button className="px-4 py-2 rounded-xl bg-slate-300 dark:bg-[#4E5766] text-black dark:text-white font-bold scale-[0.98] cursor-pointer">
                    Export Markdown
                  </button>
                </td>
                <td>
                  <button disabled className="px-4 py-2 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 text-slate-400 font-bold cursor-not-allowed border border-transparent">
                    Export Markdown
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Inputs, Commands & Badges */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Command size={18} className="text-[#325FEC]" />
            <h2 className="text-xl font-extrabold tracking-tight">3. Inputs, Badges & Interactive Chips</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Search inputs with keyboard accelerators, category pills, and selector badges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Universal Search Bar */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Search Component</h4>
            <div className="relative flex items-center">
              <Search size={16} className="absolute left-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search across all captured notes and citations..."
                className="w-full pl-11 pr-20 py-3 rounded-2xl bg-[#F0F1F5] dark:bg-[#202531] border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#518FFF]"
              />
              <div className="absolute right-3 flex items-center gap-1 bg-white dark:bg-[#37404F] border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-slate-500 dark:text-slate-300">
                <span>⌘</span>
                <span>K</span>
              </div>
            </div>
          </div>

          {/* Badges & Category Chips */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Pills & Status Chips</h4>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EBF3FF] dark:bg-[#142444] text-[#325FEC] dark:text-[#518FFF] border border-[#325FEC]/20 flex items-center gap-1.5">
                <Quote size={12} /> Text Clip
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3EEFF] dark:bg-[#261B40] text-[#7C3AED] dark:text-[#A78BFA] border border-[#7C3AED]/20 flex items-center gap-1.5">
                <Sparkles size={12} /> AI Summary
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#ECFDF5] dark:bg-[#062D20] text-[#059669] dark:text-[#34D399] border border-[#059669]/20 flex items-center gap-1.5">
                <Layers size={12} /> DOM Block
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] dark:bg-[#332200] text-[#D97706] dark:text-[#FBBF24] border border-[#D97706]/20 flex items-center gap-1.5">
                <Bookmark size={12} /> OCR Image
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                div.pricing-card
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
