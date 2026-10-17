'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Moon, Sun, CheckCircle } from '@phosphor-icons/react';
import { ContentCardModel } from '@/lib/types/contentBlocks';
import { ContentCardShell } from '@/components/content/ContentCardShell';
import { ThemeToggle } from '@/components/ThemeToggle';

const MOCK_AI_CARD: ContentCardModel = {
  id: 'card-ai-1',
  title: 'Solid-State Battery Thermal Management & Anode Degradation',
  sourceType: 'ai',
  workspace: 'Artificial Intelligence & Engineering',
  subspace: 'Solid-State Battery Deep Dive',
  createdAt: new Date().toISOString(),
  schemaVersion: 2,
  rawMarkdownBackup: `### Executive Summary\nSolid-state electrolytes demonstrate up to 40% thermal dissipation efficiency improvement over liquid electrolyte baselines under sustained 3C discharge cycles.\n\n### Key Points\n- Dendrite growth suppressed below 45°C.\n- Interfacial resistance increases non-linearly at sub-zero temperatures.\n\n### Evidence & Data\n> "Sulfide-based solid electrolytes maintain ionic conductivity exceeding 10 mS/cm at ambient temperature." — Janek et al., Nature Energy [p. 142]`,
  sections: [
    {
      id: 'sec-summary',
      kind: 'summary',
      title: 'Executive Summary',
      blocks: [
        {
          type: 'summary',
          text: 'Solid-state electrolytes demonstrate up to 40% thermal dissipation efficiency improvement over liquid electrolyte baselines under sustained 3C discharge cycles.',
          confidence: 0.94,
        },
      ],
    },
    {
      id: 'sec-key-points',
      kind: 'key_points',
      title: 'Key Findings',
      blocks: [
        {
          type: 'list',
          items: [
            'Dendrite penetration suppressed below 45°C with 5 MPa external stack pressure.',
            'Interfacial resistance increases non-linearly at sub-zero temperatures (-20°C to 0°C).',
            'Cathode-electrolyte interphase (CEI) stability remains stable across 800 continuous cycles.',
          ],
        },
      ],
    },
    {
      id: 'sec-evidence',
      kind: 'evidence',
      title: 'Empirical Evidence',
      blocks: [
        {
          type: 'quote',
          quote: 'Sulfide-based solid electrolytes maintain ionic conductivity exceeding 10 mS/cm at ambient temperature, outperforming traditional carbonate solvents.',
          sourceTitle: 'Nature Energy (2025)',
          pageNumber: 142,
          deepLink: 'https://example.com/paper#:~:text=Sulfide-based',
        },
        {
          type: 'table',
          caption: 'Thermal Runaway Threshold Comparison',
          headers: ['Electrolyte Type', 'Critical Temp (°C)', 'Heat Release (J/g)', 'Cycle Life (80% SOH)'],
          rows: [
            ['Liquid (1M LiPF6 in EC/DMC)', '165°C', '890 J/g', '1,200'],
            ['Gel Polymer (PVDF-HFP)', '210°C', '620 J/g', '1,500'],
            ['Sulfide Solid (Li10GeP2S12)', '340°C', '210 J/g', '2,400'],
            ['Oxide Solid (LLZO Garnet)', '480°C', '85 J/g', '3,500'],
          ],
        },
      ],
    },
    {
      id: 'sec-sources',
      kind: 'sources',
      title: 'Verified Sources',
      isCollapsible: true,
      defaultCollapsed: false,
      blocks: [
        {
          type: 'source',
          title: 'Mechanical Properties and Chemo-Mechanics of Solid Electrolytes',
          url: 'https://nature.com/articles/s41560-025-0012',
          domain: 'nature.com',
          timestampOffset: 0,
        },
        {
          type: 'source',
          title: 'MIT Battery Lab 2026 Seminar: Dendrite Mitigation at Scale',
          url: 'https://youtube.com/watch?v=mock-mit-battery',
          domain: 'youtube.com',
          timestampOffset: 245,
        },
      ],
    },
    {
      id: 'sec-callout',
      kind: 'custom',
      title: 'Confidence Assessment',
      blocks: [
        {
          type: 'callout',
          intent: 'success',
          title: 'High Provenance Confidence',
          body: 'All quantitative findings are directly cross-referenced against 3 peer-reviewed publications and 1 technical teardown transcript.',
        },
      ],
    },
  ],
};

const MOCK_STRESS_CARD: ContentCardModel = {
  id: 'card-stress-1',
  title: 'Extreme Content Stress Test (Unbroken strings, large tables, empty states)',
  sourceType: 'user',
  workspace: 'Test Lab',
  createdAt: new Date().toISOString(),
  schemaVersion: 2,
  sections: [
    {
      id: 'sec-stress-words',
      kind: 'custom',
      title: 'Unbroken String & Code Wrapping',
      blocks: [
        {
          type: 'paragraph',
          text: 'SuperLongUnbrokenStringWithoutAnySpacesToEnsureFlexContainersNeverBlowOutHorizontalLayoutsSuperLongUnbrokenStringWithoutAnySpacesToEnsureFlexContainersNeverBlowOutHorizontalLayoutsSuperLongUnbrokenStringWithoutAnySpacesToEnsureFlexContainersNeverBlowOutHorizontalLayouts',
        },
        {
          type: 'code',
          language: 'typescript',
          code: `function exhaustiveMatcher(block: ContentBlock): JSX.Element {\n  switch (block.type) {\n    case 'summary': return <SummaryBlock {...block} />;\n    default: return assertNever(block);\n  }\n}`,
        },
      ],
    },
    {
      id: 'sec-large-table',
      kind: 'custom',
      title: 'Large 25-Row Table (Collapsible Preview)',
      isCollapsible: true,
      blocks: [
        {
          type: 'table',
          headers: ['Index', 'Parameter', 'Baseline', 'Measured', 'Delta %'],
          rows: Array.from({ length: 25 }, (_, i) => [
            `#${i + 1}`,
            `Electrolyte Resistance Sample ${String.fromCharCode(65 + (i % 26))}`,
            `${(100 + i * 2.5).toFixed(1)} Ω`,
            `${(90 + i * 2.2).toFixed(1)} Ω`,
            `-${((10 - i * 0.1) * 1.2).toFixed(2)}%`,
          ]),
        },
      ],
    },
    {
      id: 'sec-callouts',
      kind: 'custom',
      title: 'Semantic Feedback Intents',
      blocks: [
        { type: 'callout', intent: 'info', title: 'Informational Notice', body: 'Standard system state operating normally.' },
        { type: 'callout', intent: 'warning', title: 'Data Conflict Warning', body: 'Conflicting values reported across two independent research clips.' },
        { type: 'callout', intent: 'danger', title: 'Source Missing Error', body: 'Failed to locate primary citation for this claim.' },
      ],
    },
  ],
};

export default function GalleryPage() {
  return (
    <div className="ob-grid min-h-screen bg-[#FAFBFD] dark:bg-[#09090B] text-[#0F172A] dark:text-[#F8FAFC] font-sans p-6 md:p-12 transition-colors">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Gallery Header */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#222225] pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-[#EEF3F8] dark:hover:bg-[#141416] transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-bold font-display tracking-tight">
                Content Hierarchy & Block Renderer Gallery
              </h1>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Stress-testing unified L1–L4 hierarchy, semantic tokens, and anti-slop rules.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Live Test Cards */}
        <section className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#325FEC]" />
              <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Scenario 1: Grounded Research AI Answer Card
              </h2>
            </div>
            <ContentCardShell card={MOCK_AI_CARD} defaultExpanded={true} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Scenario 2: Extreme Stress Content (Unbroken words & large tables)
              </h2>
            </div>
            <ContentCardShell card={MOCK_STRESS_CARD} defaultExpanded={true} />
          </div>
        </section>

        {/* Verification Checklist */}
        <div className="p-4 rounded-xl border border-[#E2E8F0] dark:border-[#222225] bg-white dark:bg-[#0E0E10] text-xs text-slate-700 dark:text-zinc-300 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[#0F172A] dark:text-white">
            <CheckCircle size={15} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
            <span>Anti-Slop Design Guardrails Verified:</span>
          </div>
          <p>• Max 2 nested container layers (Card to Inset Section/Table).</p>
          <p>• Grayscale surfaces throughout; semantic colors strictly on icons and accents.</p>
          <p>• Raw Markdown backup is concealed by default with toggleable inspector.</p>
          <p>• 100% typed via Matt Pocock discriminated unions without 'any'.</p>
        </div>
      </div>
    </div>
  );
}
