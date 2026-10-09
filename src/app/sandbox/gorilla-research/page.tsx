'use client';

import React, { useState } from 'react';

export default function GorillaResearchPage() {
  const [activeTab, setActiveTab] = useState<'ethology' | 'acoustics' | 'demographics'>('ethology');

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1E293B] font-sans antialiased selection:bg-[#D2F83C] selection:text-black">
      {/* Top Academic Journal Header Bar */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-[#1E293B] text-[#D2F83C] text-[11px] font-mono font-bold px-2 py-0.5 rounded">
              PRIMATOLOGY ETHOLOGY QUARTERLY
            </span>
            <span className="text-xs text-[#64748B] font-mono">Vol. 48, Iss. 3 • Peer Reviewed</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#64748B]">
            <span className="hidden sm:inline">DOI: 10.1016/j.ethol.2026.04.019</span>
            <span className="bg-[#DCFCE7] text-[#166534] font-semibold px-2 py-0.5 rounded text-[10px]">
              OPEN ACCESS
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Article Title & Metadata Header */}
        <div className="border-b border-[#E2E8F0] pb-8 mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-[#D97706] mb-3 uppercase tracking-wider font-semibold">
            <span>Gorilla beringei beringei</span>
            <span>•</span>
            <span>Virunga Massif Long-term Field Study</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-[#0F172A] tracking-tight leading-tight mb-4">
            Acoustic Signatures of Chest-Beating and Dominance Maintenance in Mountain Gorilla Troops
          </h1>

          <p className="text-lg text-[#475569] font-serif leading-relaxed italic mb-6">
            An empirical investigation into infrasonic body-size honest signaling, silverback mediation protocols, and alloparental grooming networks across 14 habituated social units.
          </p>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#F1F5F9] text-xs text-[#64748B]">
            <div>
              <span className="font-semibold text-[#1E293B]">Lead Authors:</span> Dr. Alistair Vance, Dr. Mwiza Nyirinkwaya, &amp; Dr. Elena Rostova
            </div>
            <div>
              <span className="font-semibold text-[#1E293B]">Field Station:</span> Karisoke Research Center, Rwanda
            </div>
            <div>
              <span className="font-semibold text-[#1E293B]">Published:</span> March 24, 2026
            </div>
          </div>
        </div>

        {/* Callout Box 1: Executive Abstract (Great for DOM Block Alt+B and Quotes) */}
        <div 
          id="executive-abstract-block" 
          className="bg-[#F8FAFC] border-l-4 border-[#3B82F6] p-5 rounded-r-lg mb-8 shadow-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider">
              Executive Research Abstract
            </h2>
            <span className="text-[10px] font-mono text-[#94A3B8]">#abstract #field-summary</span>
          </div>
          <p className="text-sm text-[#334155] leading-relaxed mb-3">
            Chest-beating in male mountain gorillas (*Gorilla beringei beringei*) constitutes one of the most energetically expensive acoustic displays in terrestrial mammals. Utilizing multi-directional acoustic hydrophones and calibrated laser distance telemetry, our team recorded 1,420 chest-beat sequences across 28 male silverbacks over a 36-month observation window.
          </p>
          <p className="text-sm text-[#334155] leading-relaxed">
            Our findings reveal that peak acoustic frequency correlates inversely with silverback body size (r = -0.84, p &lt; 0.001), serving as an uncheatable honest indicator of physical fighting capability without requiring lethal physical escalation.
          </p>
        </div>

        {/* Section 1: Troop Social Structure & Hierarchy */}
        <section className="mb-10 space-y-4">
          <h2 className="text-2xl font-serif font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
            1. Social Structure &amp; The Silverback Hegemony
          </h2>
          
          <p className="text-base text-[#334155] leading-relaxed">
            Mountain gorilla social units typically comprise a single dominant adult male (the alpha silverback), multiple adult females, subadult blackbacks, and dependent juveniles. Alpha silverbacks command exclusive access to core foraging patches and mediate intra-troop squabbles with non-contact vocal grunts and postural displays.
          </p>

          {/* Key Quote 1 for Text Capture */}
          <blockquote className="my-6 border-l-4 border-[#D2F83C] bg-[#1E293B] text-slate-100 p-4 rounded-r-lg font-serif text-base italic shadow-md">
            "The stability of a 20-member gorilla troop relies not on brute physical terror, but on the silverback's predictable intervention consistency during feeding conflicts. Alpha males that spent 14% more time in spatial proximity to lactating females exhibited zero infanticide attempts from rogue solitary silverbacks."
          </blockquote>

          <p className="text-base text-[#334155] leading-relaxed">
            Subordinate blackbacks aged between 8 and 12 years face a critical life-history bifurcation: they may either remain within the natal troop as subordinate sentinels or disperse into the high-altitude afro-alpine zone to recruit solitary females from neighboring troops.
          </p>
        </section>

        {/* Section 2: Empirical Data Table (Perfect for Marquee Screenshot Alt+C and DOM Block Alt+B) */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-serif font-bold text-[#0F172A]">
              2. Acoustic &amp; Morphometric Measurement Matrix
            </h2>
            <span className="text-xs font-mono text-[#64748B]">Table 2.1 (Calibrated telemetry data)</span>
          </div>

          <div 
            id="gorilla-metrics-table"
            className="overflow-x-auto border border-[#CBD5E1] rounded-lg shadow-sm bg-white"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0F172A] text-white font-mono">
                  <th className="py-3 px-4 border-b border-[#334155]">Troop Identifier</th>
                  <th className="py-3 px-4 border-b border-[#334155]">Alpha Name</th>
                  <th className="py-3 px-4 border-b border-[#334155]">Est. Weight (kg)</th>
                  <th className="py-3 px-4 border-b border-[#334155]">Chest Beat Frequency (Hz)</th>
                  <th className="py-3 px-4 border-b border-[#334155]">Audible Radius (km)</th>
                  <th className="py-3 px-4 border-b border-[#334155]">Troop Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-sans">
                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2563EB]">TR-KARI-01</td>
                  <td className="py-2.5 px-4 font-medium text-[#0F172A]">Cantsbee II</td>
                  <td className="py-2.5 px-4 font-mono">218 kg</td>
                  <td className="py-2.5 px-4 font-mono text-[#DC2626] font-semibold">182 Hz</td>
                  <td className="py-2.5 px-4 font-mono">2.8 km</td>
                  <td className="py-2.5 px-4">24 gorillas</td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] bg-[#F8FAFC]/50">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2563EB]">TR-BISOKE-04</td>
                  <td className="py-2.5 px-4 font-medium text-[#0F172A]">Urugamba</td>
                  <td className="py-2.5 px-4 font-mono">195 kg</td>
                  <td className="py-2.5 px-4 font-mono text-[#DC2626] font-semibold">214 Hz</td>
                  <td className="py-2.5 px-4 font-mono">2.2 km</td>
                  <td className="py-2.5 px-4">17 gorillas</td>
                </tr>
                <tr className="hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2563EB]">TR-SABYI-02</td>
                  <td className="py-2.5 px-4 font-medium text-[#0F172A]">Guhonda</td>
                  <td className="py-2.5 px-4 font-mono">226 kg</td>
                  <td className="py-2.5 px-4 font-mono text-[#DC2626] font-semibold">168 Hz</td>
                  <td className="py-2.5 px-4 font-mono">3.4 km</td>
                  <td className="py-2.5 px-4">29 gorillas</td>
                </tr>
                <tr className="hover:bg-[#F8FAFC] bg-[#F8FAFC]/50">
                  <td className="py-2.5 px-4 font-mono font-bold text-[#2563EB]">TR-MIK-08</td>
                  <td className="py-2.5 px-4 font-medium text-[#0F172A]">Kwitonda</td>
                  <td className="py-2.5 px-4 font-mono">180 kg</td>
                  <td className="py-2.5 px-4 font-mono text-[#DC2626] font-semibold">245 Hz</td>
                  <td className="py-2.5 px-4 font-mono">1.9 km</td>
                  <td className="py-2.5 px-4">12 gorillas</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-[#64748B] mt-2 italic">
            Note: Frequencies measured with parabolic shotgun telemetry at standardized 25-meter ambient distance.
          </p>
        </section>

        {/* Section 3: Visual Infographic Cards (High Contrast, perfect for Cropper & DOM Block) */}
        <section className="mb-10">
          <h2 className="text-2xl font-serif font-bold text-[#0F172A] mb-4">
            3. Vocalization Taxonomy &amp; Communicative Function
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <div 
              id="vocal-card-grunts"
              className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#3B82F6] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                  DOUBLE GRUNT
                </span>
                <span className="text-[10px] text-[#64748B]">0.8 – 1.2 kHz</span>
              </div>
              <h3 className="font-serif font-bold text-sm text-[#0F172A] mb-1">Troop Cohesion &amp; Travel</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Emitted by the silverback prior to shifting grazing zones. Confirms directional consensus across dense bamboo thickets.
              </p>
            </div>

            {/* Card 2 */}
            <div 
              id="vocal-card-hoots"
              className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#D97706] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded">
                  HOOT SERIES
                </span>
                <span className="text-[10px] text-[#64748B]">150 – 400 Hz</span>
              </div>
              <h3 className="font-serif font-bold text-sm text-[#0F172A] mb-1">Pre-Chest Beat Agonism</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Accelerating rhythmic vocalization preceding physical chest impact. Signals territorial boundary tension to adjacent groups.
              </p>
            </div>

            {/* Card 3 */}
            <div 
              id="vocal-card-purrs"
              className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-sm hover:border-[#16A34A] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-[#16A34A] bg-[#DCFCE7] px-2 py-0.5 rounded">
                  BELCH / PURR
                </span>
                <span className="text-[10px] text-[#64748B]">Low infrasonic</span>
              </div>
              <h3 className="font-serif font-bold text-sm text-[#0F172A] mb-1">Digestive Satisfaction</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Mutual reassurance sound produced during extensive wild celery and thistle feeding bouts. Reduces vigilance stress by 42%.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Nutritional Ecology & High-Altitude Botanical Diet */}
        <section className="mb-10 space-y-4">
          <h2 className="text-2xl font-serif font-bold text-[#0F172A] border-b border-[#E2E8F0] pb-2">
            4. High-Altitude Nutritional Energetics
          </h2>

          <p className="text-base text-[#334155] leading-relaxed">
            Mountain gorillas are folivorous herbivores with specialized hindgut fermentation chambers capable of breaking down lignified plant cellulose. Adult silverbacks consume approximately 18 to 25 kilograms of wet biomass per day across four primary botanical species:
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#334155]">
            <li className="p-3 bg-[#F1F5F9] rounded border border-[#E2E8F0] flex items-start gap-2">
              <span className="text-[#16A34A] font-bold">🌿</span>
              <div>
                <strong className="text-[#0F172A]">Peucedanum linderi (Wild Celery):</strong> 42% of dry matter intake, high water content, essential sodium source.
              </div>
            </li>
            <li className="p-3 bg-[#F1F5F9] rounded border border-[#E2E8F0] flex items-start gap-2">
              <span className="text-[#16A34A] font-bold">🌱</span>
              <div>
                <strong className="text-[#0F172A]">Carduus nyassanus (Giant Thistle):</strong> Rich in non-structural carbohydrates; juveniles peel stalks with incisors.
              </div>
            </li>
            <li className="p-3 bg-[#F1F5F9] rounded border border-[#E2E8F0] flex items-start gap-2">
              <span className="text-[#16A34A] font-bold">🎋</span>
              <div>
                <strong className="text-[#0F172A]">Yushania alpina (Bamboo Shoots):</strong> Seasonal surge during rainy months (Nov-Dec); high protein-to-fiber ratio.
              </div>
            </li>
            <li className="p-3 bg-[#F1F5F9] rounded border border-[#E2E8F0] flex items-start gap-2">
              <span className="text-[#16A34A] font-bold">🪵</span>
              <div>
                <strong className="text-[#0F172A]">Galgula bark &amp; epiphytic mosses:</strong> Mineral supplementation during winter frosts at &gt;3,200m elevation.
              </div>
            </li>
          </ul>

          {/* Key Quote 2 for Text Capture */}
          <blockquote className="my-6 border-l-4 border-[#3B82F6] bg-[#EFF6FF] text-[#1E3A8A] p-4 rounded-r-lg font-serif text-sm italic">
            "Unlike lowland gorillas that travel up to 4 kilometers daily in search of ripe seasonal drupes and figs, mountain gorillas traverse less than 500 meters per day because they reside essentially inside their own salad bowl."
          </blockquote>
        </section>

        {/* Callout Box 2: Conservation Protocols & Field Telemetry */}
        <div 
          id="conservation-summary-box"
          className="p-5 rounded-lg border border-[#FDE68A] bg-[#FEFCE8] mb-10 text-xs text-[#78350F]"
        >
          <div className="flex items-center gap-2 mb-2 font-bold font-mono text-[#B45309]">
            <span>⚠️ CRITICAL FIELD PROTOCOL</span>
            <span>•</span>
            <span>IUCN MOUNTAIN GORILLA CENSUS (2026 UPDATE)</span>
          </div>
          <p className="leading-relaxed mb-2">
            Total wild population across the Virunga Massif and Bwindi Impenetrable National Park stands at <strong>1,063 individuals</strong>. Researchers and eco-trackers must maintain a minimum distance of 7 meters at all times and wear N95 filtration masks to prevent transmission of human respiratory pathogens (metapneumovirus and rhinovirus).
          </p>
          <div className="flex items-center gap-4 pt-2 border-t border-[#FDE68A]/60 font-mono text-[10px]">
            <span>Status: Endangered (Population Trend: Increasing)</span>
            <span>Ranger Patrols: 24/7 Anti-Poaching Guard</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[#E2E8F0] pt-6 text-xs text-[#94A3B8] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 International Primatological Society • Open Research Dataset
          </div>
          <div className="font-mono text-[10px] text-[#64748B]">
            Researchie In-Situ Test Suite Sandbox
          </div>
        </footer>
      </main>
    </div>
  );
}
