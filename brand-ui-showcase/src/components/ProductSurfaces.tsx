import React, { useState } from 'react';
import { Sparkles, Layers, Quote, Bookmark, ExternalLink, Copy, Check, MessageSquare, ArrowRight, ShieldCheck, ChevronRight, CornerDownRight, CheckCircle2 } from 'lucide-react';

export const ProductSurfaces: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [activeSurfaceTab, setActiveSurfaceTab] = useState<'website' | 'extension' | 'platform'>('website');
  const [copiedClip, setCopiedClip] = useState<string | null>(null);

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedClip(text);
    setTimeout(() => setCopiedClip(null), 1800);
  };

  return (
    <div className="space-y-12">
      {/* Surface Selector Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] shadow-sm">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#325FEC]">
            Three-Tier Surface Distribution
          </span>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
            Where What Applies
          </h3>
        </div>

        <div className="flex bg-[#F0F1F5] dark:bg-[#0A0E15] p-1.5 rounded-2xl gap-1 w-full sm:w-auto">
          {[
            { id: 'website', label: '1. Marketing Website (100% Richness)' },
            { id: 'extension', label: '2. Chrome Extension (Focused 40%)' },
            { id: 'platform', label: '3. Reading Platform (Low Load 15%)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSurfaceTab(tab.id as any)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSurfaceTab === tab.id
                  ? 'bg-white dark:bg-[#202531] text-black dark:text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TIER 1: MARKETING WEBSITE (100% VISUAL RICHNESS)                           */}
      {/* ========================================================================= */}
      {activeSurfaceTab === 'website' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Hero Section */}
          <div
            style={{
              background: 'linear-gradient(135deg, #081116 0%, #0E223D 45%, #1D4ED8 80%, #518FFF 100%)',
            }}
            className="rounded-[32px] p-8 md:p-14 text-white relative overflow-hidden shadow-2xl border border-blue-400/30"
          >
            {/* Atmospheric Background Glows & Rays */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#518FFF]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#325FEC]/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white mb-6">
                <Sparkles size={13} className="text-[#518FFF]" />
                <span>Next-Gen Web Research & DOM Extraction</span>
              </div>

              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
                Turn Scattered Web Research into Crystal-Clear Knowledge.
              </h1>

              <p className="text-sm md:text-base text-slate-200 font-medium mt-4 leading-relaxed">
                Save highlighted text with exact sentence scroll-links, extract complex pricing tables as clean styled DOM blocks, and synthesize across 20 tabs without losing context.
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-8">
                <button className="px-6 py-3.5 rounded-2xl bg-[#518FFF] hover:bg-[#60A5FA] text-[#081116] font-extrabold text-xs shadow-[0_0_24px_rgba(81,143,255,0.6)] transition-all transform hover:-translate-y-0.5 cursor-pointer">
                  Install Chrome Extension — Free
                </button>
                <button className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white font-bold text-xs transition-all cursor-pointer">
                  View Live Platform Demo
                </button>
              </div>
            </div>

            {/* Glowing Specular Cards Grid (Simulating Image 2 & 5) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/15">
              {[
                {
                  title: 'Deep Text Scroll Links',
                  desc: 'Every quote opens the original page scrolled and highlighted to the exact paragraph.',
                  badge: 'Text Clip',
                },
                {
                  title: 'DOM Block Inspector',
                  desc: 'Capture pricing grids and comparison tables as clean interactive components.',
                  badge: 'DOM Scraper',
                },
                {
                  title: 'Cross-Note Synthesis',
                  desc: 'Select 10 clips and generate a structured brief with verified citations in 2 seconds.',
                  badge: 'AI Engine',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="refraction-glow-card p-6 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#518FFF]">
                      {card.badge}
                    </span>
                    <h4 className="text-base font-extrabold text-white mt-1.5">{card.title}</h4>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{card.desc}</p>
                  </div>
                  <div className="mt-6 flex items-center gap-1 text-xs font-bold text-[#518FFF] group-hover:translate-x-1 transition-transform">
                    <span>Learn how it works</span>
                    <ArrowRight size={13} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIER 2: CHROME EXTENSION (FOCUSED 40% VISUAL LOAD)                        */}
      {/* ========================================================================= */}
      {activeSurfaceTab === 'extension' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Mock Web Page with Floating Selection Pill */}
            <div className="lg:col-span-7 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="text-xs font-mono text-slate-400 ml-2">stripe.com/pricing</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Simulated Web Page</span>
              </div>

              {/* Page Content */}
              <div className="space-y-4 text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Stripe Global Payments Infrastructure
                </h3>
                <p>
                  A complete payments platform engineered for growth. Whether you are scaling a subscription business, an on-demand marketplace, or a global enterprise.
                </p>

                {/* Highlighted Quote Box with Floating Selection Pill */}
                <div className="relative my-6 p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border-2 border-[#518FFF]">
                  <p className="font-semibold text-slate-900 dark:text-white text-xs">
                    "Standard pricing starts at 2.9% + 30¢ per successful card charge, with custom interchange-plus models available for companies scaling past $100k monthly volume."
                  </p>

                  {/* Floating Selection Pill Overlay (Shadow DOM Simulation) */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-[#081116] text-white shadow-2xl border border-[#518FFF]/60 backdrop-blur-md">
                    <button className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#325FEC] hover:bg-[#254ECD] text-[11px] font-extrabold text-white transition-all cursor-pointer">
                      <Bookmark size={11} />
                      <span>Save to Project</span>
                      <span className="text-[9px] font-mono opacity-60 ml-1">Alt+S</span>
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold text-slate-200 transition-all cursor-pointer">
                      <Sparkles size={11} className="text-[#518FFF]" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>

                <p>
                  Integrated fraud detection powered by machine learning algorithms trained on billions of transaction vectors.
                </p>
              </div>
            </div>

            {/* Right Chrome Side Panel (`chrome.sidePanel`) Mock */}
            <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-[#0A0E15] text-white p-6 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#325FEC] flex items-center justify-center text-white font-bold text-xs">
                      R
                    </div>
                    <span className="text-xs font-extrabold text-white">Researchie Side Panel</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#518FFF]/20 text-[#518FFF] border border-[#518FFF]/30">
                    Active Tab Sync
                  </span>
                </div>

                {/* AI Summary Box */}
                <div className="p-4 rounded-2xl bg-[#202531] border border-slate-700 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#518FFF]">
                    <Sparkles size={13} />
                    <span>3-Bullet Page Summary</span>
                  </div>
                  <ul className="text-[11.5px] text-slate-300 space-y-1.5 list-disc pl-4 leading-normal">
                    <li>Base transaction fee: 2.9% + 30¢ with volume tiering past $100k.</li>
                    <li>Supports 135+ global currencies and local payout rails.</li>
                    <li>Built-in ML radar fraud protection active on all tiers.</li>
                  </ul>
                  <button className="w-full mt-3 py-2 rounded-xl bg-[#325FEC] hover:bg-[#254ECD] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                    <span>Save Summary to Project</span>
                  </button>
                </div>

                {/* Interactive Q&A Input */}
                <div className="mt-4 p-4 rounded-2xl bg-[#161C26] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400">Ask about this page:</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. What are the enterprise fees?"
                      className="w-full px-3 py-2 rounded-xl bg-[#0A0E15] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#518FFF]"
                    />
                    <button className="px-3 py-2 rounded-xl bg-[#325FEC] text-white text-xs font-bold cursor-pointer">
                      Ask
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[10.5px] font-mono text-slate-500 text-center pt-4">
                Manifest V3 · Isolated Shadow DOM
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIER 3: READING & SYNTHESIS PLATFORM (15% LOW VISUAL LOAD)               */}
      {/* ========================================================================= */}
      {activeSurfaceTab === 'platform' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-[#F0F1F5] dark:bg-[#0A0E15] p-6 sm:p-10 shadow-inner">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Timeline Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-300 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Project: Fintech Pricing Teardown
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    14 notes collected across 6 domains · Monochromatic eye-comfort reading mode
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 rounded-xl bg-[#325FEC] text-white font-bold text-xs shadow-sm hover:bg-[#254ECD] flex items-center gap-1.5 cursor-pointer">
                    <Sparkles size={13} />
                    <span>Synthesize (4 Selected)</span>
                  </button>
                </div>
              </div>

              {/* Research Timeline Stream (The 4 Note Types) */}
              <div className="space-y-4">
                {/* Note 1: Text Clip with Scroll Link */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#202531] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-[#325FEC]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#325FEC] dark:text-[#518FFF] text-[10.5px] font-extrabold uppercase tracking-wider">
                        TEXT CLIP
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        stripe.com/pricing
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">2 hours ago</span>
                  </div>

                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed pl-3 border-l-2 border-[#325FEC]">
                    "Standard pricing starts at 2.9% + 30¢ per successful card charge, with custom interchange-plus models available for companies scaling past $100k monthly volume."
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => copyText("Standard pricing starts at 2.9% + 30¢ per successful card charge...")}
                      className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedClip ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copiedClip ? 'Copied' : 'Copy Quote'}</span>
                    </button>

                    <a
                      href="https://stripe.com/pricing#:~:text=Standard%20pricing%20starts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#325FEC] dark:text-[#518FFF] text-xs font-extrabold hover:underline"
                    >
                      <span>Jump to exact text on live page</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Note 2: DOM Layout Block */}
                <div className="p-6 rounded-2xl bg-white dark:bg-[#202531] border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:border-[#325FEC]">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10.5px] font-extrabold uppercase tracking-wider">
                        DOM BLOCK
                      </span>
                      <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                        div.pricing-matrix-container
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">Yesterday</span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#161C26] border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="p-3 bg-white dark:bg-[#202531] rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-500">Starter</span>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">$0</div>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#202531] rounded-lg border-2 border-[#325FEC]">
                        <span className="font-bold text-[#325FEC]">Pro Tier</span>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">$12/mo</div>
                      </div>
                      <div className="p-3 bg-white dark:bg-[#202531] rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-500">Enterprise</span>
                        <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">Custom</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
