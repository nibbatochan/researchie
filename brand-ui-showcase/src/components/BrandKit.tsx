import React, { useState } from 'react';
import { Copy, Check, Sparkles, Sliders, Layers, Grid, Compass, Type } from 'lucide-react';

export const BrandKit: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [refractionIntensity, setRefractionIntensity] = useState<number>(80);
  const [blurLevel, setBlurLevel] = useState<number>(16);
  const [gridOpacity, setGridOpacity] = useState<number>(12);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedColor(text);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  const coreColors = [
    { name: 'Obsidian Black', hex: '#081116', role: 'Deepest Void / Hero Backdrop', textColor: '#FFFFFF', border: 'border-slate-800' },
    { name: 'Midnight Black', hex: '#0A0E15', role: 'Platform Dark Canvas (Black 100)', textColor: '#FFFFFF', border: 'border-slate-800' },
    { name: 'Royal Blue', hex: '#325FEC', role: 'Primary Brand Solid & CTAs', textColor: '#FFFFFF', border: 'border-blue-700' },
    { name: 'Electric Cyan Blue', hex: '#518FFF', role: 'Specular Rim Glow & Citations', textColor: '#0A0E15', border: 'border-blue-400' },
    { name: 'Pure White', hex: '#FFFFFF', role: 'High Contrast Ink & Light Canvas', textColor: '#0A0E15', border: 'border-slate-300' },
  ];

  const gradients = [
    {
      title: 'Oceanic Momentum (Hero Brand)',
      css: 'linear-gradient(135deg, #081116 0%, #0E223D 45%, #1D4ED8 80%, #518FFF 100%)',
      desc: 'Used for hero marketing backdrops, dynamic brand graphics, and major campaign visuals.',
    },
    {
      title: 'Kinetic Prismatic Ray',
      css: 'radial-gradient(circle at 50% 0%, rgba(81, 143, 255, 0.4) 0%, rgba(50, 95, 236, 0.15) 50%, rgba(8, 17, 22, 0.95) 100%)',
      desc: 'Creates a focused spotlight behind key product features and interactive cards.',
    },
    {
      title: 'Atmospheric Dispersion (Poseidon Blur)',
      css: 'radial-gradient(circle at 30% 30%, #518FFF 0%, #1D4ED8 40%, #081116 85%)',
      desc: 'Smooth Gaussian optical background for modal overlays and elevated brand canvases.',
    },
    {
      title: 'Frosted Glass Dark Surface',
      css: 'linear-gradient(135deg, rgba(32, 37, 49, 0.75) 0%, rgba(10, 14, 21, 0.85) 100%)',
      desc: 'Standard floating container fill for the Chrome Extension and floating command bars.',
    },
  ];

  return (
    <div className="space-y-16">
      {/* 1. Core Brand Colors */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#518FFF]"></span>
              <h2 className="text-xl font-extrabold tracking-tight">1. Core Brand Palette</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Extracted directly from the brand color specification sheet. Click any swatch to copy Hex.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {coreColors.map((c) => (
            <div
              key={c.hex}
              onClick={() => copyToClipboard(c.hex)}
              className={`group cursor-pointer rounded-2xl p-5 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-xl border ${c.border}`}
              style={{ backgroundColor: c.hex, color: c.textColor }}
            >
              <div className="flex justify-between items-start mb-10">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase opacity-80">
                  {c.hex}
                </span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/20 text-white">
                  {copiedColor === c.hex ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
              <h3 className="text-base font-extrabold tracking-tight leading-tight">{c.name}</h3>
              <p className="text-[11px] font-medium opacity-80 mt-1 leading-snug">{c.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Light Refraction & Optical Physics Engine */}
      <section className="p-8 rounded-3xl border border-slate-800 bg-[#081116] text-white relative overflow-hidden shadow-2xl">
        {/* Background Grid behind refraction demo */}
        <div
          className="absolute inset-0 bg-grid-dark pointer-events-none"
          style={{ opacity: gridOpacity / 100 }}
        />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-800/80 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#518FFF]" />
                <h2 className="text-xl font-extrabold tracking-tight">2. Light Refraction & Specular Rim Glow Engine</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Simulating the blue specular edge highlights and inner luminescence observed in the reference cards.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-6 bg-[#0E1726]/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/60">
              <div className="flex items-center gap-3">
                <Sliders size={14} className="text-[#518FFF]" />
                <span className="text-xs font-bold text-slate-300">Glow: {refractionIntensity}%</span>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={refractionIntensity}
                  onChange={(e) => setRefractionIntensity(Number(e.target.value))}
                  className="w-24 accent-[#518FFF] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3">
                <Layers size={14} className="text-[#518FFF]" />
                <span className="text-xs font-bold text-slate-300">Blur: {blurLevel}px</span>
                <input
                  type="range"
                  min="4"
                  max="32"
                  value={blurLevel}
                  onChange={(e) => setBlurLevel(Number(e.target.value))}
                  className="w-24 accent-[#518FFF] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3">
                <Grid size={14} className="text-[#518FFF]" />
                <span className="text-xs font-bold text-slate-300">Grid: {gridOpacity}%</span>
                <input
                  type="range"
                  min="0"
                  max="40"
                  value={gridOpacity}
                  onChange={(e) => setGridOpacity(Number(e.target.value))}
                  className="w-24 accent-[#518FFF] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4 Interactive Refraction Cards (Simulating Image 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { ticker: 'AMZN', vol: '$ 1.8B vol', delta: '-1.4%', state: 'Active Clip' },
              { ticker: 'GOOG', vol: '$ 2.9B vol', delta: '+3.2%', state: 'DOM Block' },
              { ticker: 'AAPL', vol: '$ 3.4B vol', delta: '+0.8%', state: 'Verified Text' },
              { ticker: 'NVDA', vol: '$ 4.1B vol', delta: '+5.7%', state: 'AI Synthesis' },
            ].map((card, idx) => (
              <div
                key={card.ticker}
                style={{
                  background: `linear-gradient(135deg, rgba(20, 36, 64, ${0.4 + (refractionIntensity / 250)}) 0%, rgba(10, 14, 21, 0.9) 100%)`,
                  backdropFilter: `blur(${blurLevel}px)`,
                  WebkitBackdropFilter: `blur(${blurLevel}px)`,
                  border: `1px solid rgba(81, 143, 255, ${0.2 + (refractionIntensity / 180)})`,
                  boxShadow: `
                    inset 0 1.5px 2px 0 rgba(255, 255, 255, ${0.3 + (refractionIntensity / 200)}),
                    inset 0 0 ${20 * (refractionIntensity / 100)}px 0 rgba(81, 143, 255, ${0.15 * (refractionIntensity / 100)}),
                    0 16px 36px -6px rgba(0, 0, 0, 0.7),
                    0 0 ${24 * (refractionIntensity / 100)}px -2px rgba(81, 143, 255, ${0.3 * (refractionIntensity / 100)})
                  `,
                }}
                className="relative rounded-[22px] p-6 text-white transition-all duration-300 hover:scale-[1.02] cursor-pointer group flex flex-col justify-between h-48 select-none"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 tracking-wider">
                    {card.vol}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#518FFF]/20 text-[#518FFF] border border-[#518FFF]/30">
                    {card.state}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-auto pt-4 border-t border-blue-400/10">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#518FFF]">▲</span>
                    <h3 className="text-xl font-extrabold tracking-tight">{card.ticker}</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono">{card.delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl bg-black/40 border border-slate-800 text-xs font-mono text-slate-400">
            <span className="text-[#518FFF] font-bold">CSS Refraction Spec:</span> border: 1px solid rgba(81,143,255,0.4); box-shadow: inset 0 1.5px 2px rgba(255,255,255,0.6), inset 0 0 20px rgba(81,143,255,0.25), 0 0 24px rgba(81,143,255,0.3);
          </div>
        </div>
      </section>

      {/* 3. Complex Gradient Catalog */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-[#325FEC]" />
            <h2 className="text-xl font-extrabold tracking-tight">3. Brand Gradient System</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Carefully tuned optical gradients used across marketing and product elevations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gradients.map((g) => (
            <div
              key={g.title}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg bg-white dark:bg-[#101520] transition-all hover:shadow-xl"
            >
              <div style={{ background: g.css }} className="h-44 w-full p-6 flex flex-col justify-end text-white relative">
                <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 self-start mb-auto">
                  Gradient Shader
                </span>
                <h4 className="text-lg font-extrabold drop-shadow-md">{g.title}</h4>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{g.desc}</p>
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                    {g.css}
                  </span>
                  <button
                    onClick={() => copyToClipboard(g.css)}
                    className="text-xs font-bold text-[#325FEC] hover:underline flex items-center gap-1 shrink-0 ml-2"
                  >
                    <Copy size={12} />
                    <span>Copy CSS</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Typography Ramp */}
      <section>
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Type size={18} className="text-[#325FEC]" />
            <h2 className="text-xl font-extrabold tracking-tight">4. Precision Typography Ramp</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            JetBrains Mono (Headers, Display & Selectors) paired with Figtree (Body, Reading & UI).
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101520] p-6 divide-y divide-slate-100 dark:divide-slate-800">
          {[
            { token: 'Display 2XL', size: '44px / 52px', weight: 'Extrabold (800)', example: 'Synthesize Deep Web Research', font: 'font-mono font-extrabold tracking-tight' },
            { token: 'Display XL', size: '32px / 40px', weight: 'Extrabold (800)', example: 'Project Timeline & Notes', font: 'font-mono font-extrabold tracking-tight' },
            { token: 'Heading LG', size: '22px / 28px', weight: 'Bold (700)', example: 'Captured Layout Blocks & Tables', font: 'font-mono font-bold' },
            { token: 'Heading MD', size: '17px / 24px', weight: 'Bold (700)', example: 'Dynamic Tier Pricing Model (Stripe)', font: 'font-mono font-bold' },
            { token: 'Body Regular', size: '13.5px / 20px', weight: 'Medium (500)', example: 'Researchie preserves exact DOM structures without stripping styles or breaking tables.', font: 'font-sans font-medium' },
            { token: 'Caption / Tag', size: '11px / 14px', weight: 'Bold (700)', example: 'FINTECH · BENCHMARKING · 2H AGO', font: 'font-sans font-bold tracking-wider uppercase' },
            { token: 'Code / Selector', size: '11.5px / 16px', weight: 'Medium (500)', example: 'div.pricing-matrix-container > table.specs', font: 'font-mono' },
          ].map((t) => (
            <div key={t.token} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-48 shrink-0">
                <span className="text-xs font-extrabold text-[#325FEC]">{t.token}</span>
                <p className="text-[10.5px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{t.size} · {t.weight}</p>
              </div>
              <div className={`flex-1 ${t.font} text-slate-900 dark:text-slate-100`}>
                <span style={{ fontSize: t.size.split(' ')[0] }}>{t.example}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
