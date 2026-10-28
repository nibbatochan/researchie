'use client';

import { createPortal } from 'react-dom';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  X,
  CheckCircle,
  Circle,
  WarningCircle,
  DownloadSimple,
  PuzzlePiece,
  Key,
  Sparkle,
  BookOpenText,
  FilePdf,
  SelectionPlus,
  FileText,
  ArrowRight,
  ArrowLeft,
  Quotes,
  Link as LinkIcon,
  Star,
  Rows,
  Graph,
} from '@phosphor-icons/react';
import { ResearchieLogo } from './ResearchieLogo';
import { useAuth } from '@/lib/auth/authContext';
import { ExtensionConnectionSettings } from './ExtensionConnectionSettings';
import { AiProviderSettings } from './AiProviderSettings';
import { PROVIDERS } from '@/lib/ai/providers';

// The "How it works" dialog. It opens by itself the first time someone reaches the dashboard, on the
// Set up tab, because nothing works until the extension is installed and an AI key is added.
// Everything the two setup steps need is inside the dialog; it never opens another dialog on top.

export type WelcomeStep = 0 | 1 | 2 | 3; // 0 brand, 1 set up, 2 what it is, 3 use cases and how to use
type StepState = 'done' | 'todo' | 'rejected' | 'unknown';

/** Where "has seen this" is remembered (the account on the tester site, the browser locally). */
export const WELCOME_SEEN_KEY = 'researchie_welcome_seen';
/** Raise this to show the dialog again to people who already closed an older version of it. */
export const WELCOME_VERSION = '1';

// ─── Is setup done? ──────────────────────────────────────────────────────────
// Only claims what can be proved. The extension counts as connected once a token of this account has
// been used. The AI key counts once one is saved and the provider has not rejected it. A local server
// has no accounts, so there is nothing to check: both steps then show no status.
export function useSetupStatus(active: boolean) {
  const { authRequired } = useAuth();
  const [extension, setExtension] = useState<StepState>('unknown');
  const [ai, setAi] = useState<StepState>('unknown');
  const [tokenMade, setTokenMade] = useState(false);

  const refresh = useCallback(async () => {
    if (!authRequired) return;
    try {
      const res = await fetch('/api/auth/tokens', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTokenMade(json.data.length > 0);
        setExtension(json.data.some((t: { lastUsedAt: string | null }) => t.lastUsedAt) ? 'done' : 'todo');
      }
    } catch {
      /* the checklist just shows no status */
    }
    try {
      const res = await fetch('/api/settings/ai-key', { cache: 'no-store', credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        setAi(!json.data.configured ? 'todo' : json.data.status === 'invalid' ? 'rejected' : 'done');
      }
    } catch {
      /* same */
    }
  }, [authRequired]);

  // Check when it matters, and again when the person comes back from Chrome or from Settings.
  useEffect(() => {
    if (!active) return;
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [active, refresh]);

  const known = authRequired;
  const doneCount = (extension === 'done' ? 1 : 0) + (ai === 'done' ? 1 : 0);
  return { extension, ai, tokenMade, known, doneCount, total: 2, complete: known && doneCount === 2, refresh };
}


// ─── Content ─────────────────────────────────────────────────────────────────
const STEP_LABELS = ['Welcome', 'Set up', 'What it is', 'How to use'];

const WHAT_IT_IS: { icon: React.ElementType; title: string; body: string; tone: string; sample: React.ReactNode }[] = [
  {
    icon: Quotes,
    title: 'Clip',
    body: 'A sentence, a table or card, an image or a link, from any page, with one key press.',
    tone: 'bg-[#325FEC]/10 text-[#325FEC] dark:text-[#8DB4FF]',
    sample: (
      <div className="rounded-lg border border-[#D2DCEA] dark:border-white/10 bg-white dark:bg-[#18181B] p-2.5 text-[11px] leading-snug">
        <span className="text-slate-700 dark:text-zinc-300">“Median survival rose from 11 to 17 months.”</span>
      </div>
    ),
  },
  {
    icon: LinkIcon,
    title: 'Keep the source',
    body: 'Every clip remembers its page. Open it and the page scrolls to the quote and highlights it.',
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    sample: (
      <div className="flex items-center gap-1.5 rounded-lg border border-[#D2DCEA] dark:border-white/10 bg-white dark:bg-[#18181B] px-2.5 py-2 text-[11px] font-mono text-slate-500 dark:text-zinc-400">
        <LinkIcon size={12} weight="bold" aria-hidden /> nejm.org/…#:~:text=Median
      </div>
    ),
  },
  {
    icon: Sparkle,
    title: 'Ask and cite',
    body: 'Ask AI answers from your clips and points back to them. Cite copies Vancouver, APA or AMA.',
    tone: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    sample: (
      <div className="rounded-lg border border-[#D2DCEA] dark:border-white/10 bg-white dark:bg-[#18181B] p-2.5 text-[11px] leading-snug text-slate-700 dark:text-zinc-300">
        Survival improved to 17 months <span className="font-mono text-[#325FEC] dark:text-[#8DB4FF]">[1]</span>
      </div>
    ),
  },
];

const USE_CASES: { icon: React.ElementType; title: string; who: string; what: string; steps: string[] }[] = [
  {
    icon: BookOpenText,
    title: 'Literature notes',
    who: 'Thesis students in science and medicine',
    what: 'Keep every paper’s key sentences in one place, grouped by chapter, each with its citation ready.',
    steps: ['Make a project for the thesis and a sub-project per chapter.', 'Select a sentence in a paper and press Send (Alt+S).', 'Press Cite on a clip and pick Vancouver, APA or AMA.'],
  },
  {
    icon: Sparkle,
    title: 'Ask your own reading',
    who: 'Anyone with a pile of clips and a question',
    what: 'Get answers drawn only from what you saved, each pointing back to the clips it used.',
    steps: ['Open the project that holds your clips.', 'Press Ask AI and type your question.', 'Follow the numbered links to the clips behind each claim.'],
  },
  {
    icon: FilePdf,
    title: 'Read a PDF and cite it',
    who: 'Students and analysts working from papers',
    what: 'Read your own PDFs next to your clips, highlight a passage and jump back to the exact spot.',
    steps: ['Switch to Document and upload the PDF.', 'Highlight a passage and clip it.', 'Ask about it and open the link to return to the page.'],
  },
  {
    icon: FileText,
    title: 'A cited draft',
    who: 'Anyone writing a memo, brief or review',
    what: 'Turn selected clips into a structured draft that keeps its references.',
    steps: ['Select the clips to use.', 'Open Deliverables and pick a template.', 'Export to PDF, Markdown, Obsidian or Notion.'],
  },
];


// ─── Small parts ─────────────────────────────────────────────────────────────
const STATE_LABEL: Record<StepState, string> = { done: 'Done', todo: 'Not done', rejected: 'Key rejected', unknown: '' };

const StatusBadge: React.FC<{ state: StepState; todoText?: string }> = ({ state, todoText }) => {
  if (state === 'unknown') return null;
  const text = state === 'todo' && todoText ? todoText : STATE_LABEL[state];
  const tone =
    state === 'done'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
      : state === 'rejected'
        ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
        : 'text-slate-600 dark:text-zinc-300 bg-white dark:bg-white/5 border-[#D2DCEA] dark:border-white/10';
  const Icon = state === 'done' ? CheckCircle : state === 'rejected' ? WarningCircle : Circle;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${tone}`}>
      <Icon size={12} weight={state === 'done' ? 'fill' : 'bold'} aria-hidden />
      {text}
    </span>
  );
};

// A looping picture of what clipping does: select a sentence, press Send, the clip lands in the project.
const ClipDemo: React.FC = () => (
  <div
    role="img"
    aria-label="Animation: a sentence on a web page is selected, Send is pressed, and the clip lands in a project with its source."
    className="relative h-[8.5rem] rounded-2xl border border-[#C5D3EA] dark:border-white/10 bg-white dark:bg-[#18181B] shadow-sm overflow-hidden"
  >
    <div className="absolute left-3 top-3 right-24 space-y-2" aria-hidden>
      <div className="h-1.5 w-4/5 rounded bg-slate-200 dark:bg-white/15" />
      <div className="relative h-4">
        <div className="ob-demo-select absolute inset-y-0 left-0 w-[9.5rem] rounded bg-[#325FEC]/30" />
        <div className="absolute inset-y-[5px] left-0 w-[9.5rem] rounded bg-slate-300 dark:bg-white/30" />
      </div>
      <div className="h-1.5 w-3/5 rounded bg-slate-200 dark:bg-white/15" />
      <div className="ob-demo-pill relative inline-flex items-center gap-1 rounded-full bg-[#325FEC] px-2.5 py-1 text-[10px] font-semibold text-white shadow">
        Send
      </div>
      <div className="ob-demo-fly absolute left-0 top-[1.6rem] h-4 w-[9.5rem] rounded bg-[#325FEC]" />
    </div>
    <div className="ob-demo-cursor absolute left-3 top-[2.4rem] h-3 w-3 border-l-2 border-t-2 border-[#0F172A] dark:border-white rotate-[-20deg]" aria-hidden />
    <div className="absolute right-2 top-2 bottom-2 w-20 rounded-xl bg-[#EEF3F8] dark:bg-white/[0.07] border border-[#D2DCEA] dark:border-white/10 p-1.5 space-y-1.5" aria-hidden>
      <div className="h-1.5 w-8 rounded bg-slate-300 dark:bg-white/25" />
      <div className="h-4 rounded bg-white dark:bg-white/10 border border-[#D2DCEA] dark:border-white/10" />
      <div className="ob-demo-land h-4 rounded bg-[#325FEC] flex items-center px-1">
        <span className="h-1 w-6 rounded bg-white/80" />
      </div>
    </div>
  </div>
);

const rise = (i: number): React.CSSProperties => ({ animationDelay: `${80 + i * 110}ms` });

// ─── The flow ────────────────────────────────────────────────────────────────
interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** First visit starts on the brand screen; reopening from the dashboard starts at Set up. */
  firstRun?: boolean;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, firstRun = false }) => {
  const status = useSetupStatus(isOpen);
  const [step, setStep] = useState<WelcomeStep>(0);
  const [setupRow, setSetupRow] = useState<'extension' | 'ai'>('extension');
  const [caseIndex, setCaseIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(firstRun ? 0 : 1);
    setCaseIndex(0);
    opener.current = document.activeElement as HTMLElement | null;
    return () => {
      const el = opener.current;
      if (el && el.isConnected) el.focus();
      else document.querySelector<HTMLElement>('[data-testid="how-it-works-button"]')?.focus();
    };
  }, [isOpen, firstRun]);

  // Each step announces itself: focus its heading.
  useEffect(() => {
    if (isOpen) (titleRef.current ?? dialogRef.current)?.focus();
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) setSetupRow(status.extension === 'done' && status.ai !== 'done' ? 'ai' : 'extension');
  }, [isOpen, status.extension, status.ai]);

  if (!isOpen) return null;

  const last = 3;
  const go = (n: number) => setStep(Math.max(0, Math.min(last, n)) as WelcomeStep);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const lastEl = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === titleRef.current)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      first.focus();
    }
  };

  const heading = (text: string, cls = '') => (
    <h2 id="welcome-title" ref={titleRef} tabIndex={-1} className={`font-display font-bold tracking-tight outline-none ${cls}`}>
      {text}
    </h2>
  );

  const uc = USE_CASES[caseIndex];
  const UcIcon = uc.icon;

  // Portal to the body: an ancestor with a transform would otherwise shift the full-screen layer.
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/60">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        data-testid="welcome-modal"
        data-step={step}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex flex-col w-full h-full overflow-hidden outline-none bg-[#0B1020] text-[#0F172A] dark:text-[#FAFAFA]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-testid="welcome-close"
          className={`absolute top-4 right-4 z-10 p-2.5 rounded-full cursor-pointer transition-colors ${
            step === 0 ? 'text-white/70 hover:bg-white/10' : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/10'
          }`}
        >
          <X size={18} />
        </button>

        {/* 0: Brand screen. Tap anywhere. Centered, with the clips pushed out to the edges. */}
        {step === 0 && (
          <button
            type="button"
            onClick={() => go(1)}
            data-testid="welcome-start"
            aria-label="Get started"
            className="ob-grid-brand relative flex-1 min-h-0 overflow-hidden cursor-pointer text-white bg-[radial-gradient(ellipse_at_50%_35%,#4C7BFF_0%,#325FEC_38%,#0B1B4D_100%)]"
          >
            {/* Spotlight behind the centre, edges fall away */}
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_60%_at_50%_48%,rgba(255,255,255,0.16),transparent_70%),radial-gradient(ellipse_at_50%_50%,transparent_45%,rgba(5,12,40,0.55)_100%)]" />

            {/* Centre column */}
            <span className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-7 px-6 text-center">
              <span className="ob-float flex w-[4.5rem] h-[4.5rem] items-center justify-center rounded-[1.4rem] bg-white/15 border border-white/30 shadow-[0_18px_50px_-12px_rgba(5,12,40,0.6),inset_0_1px_0_rgba(255,255,255,0.35)]">
                <ResearchieLogo className="w-10 h-10 text-white" />
              </span>
              <span className="ob-rise block space-y-4" style={rise(1)}>
                <span id="welcome-title" className="block text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-[1.05]">
                  Research from the web, with every source kept.
                </span>
                <span className="mx-auto block max-w-lg text-base sm:text-lg text-white/80">
                  Clip it, ask it, cite it. Each clip remembers exactly where it came from.
                </span>
              </span>
              <span className="ob-rise block w-full max-w-md" style={rise(2)} aria-hidden>
                <span className="relative flex flex-col items-center gap-2.5 rounded-2xl border border-white/25 bg-white/10 px-4 py-4 text-sm text-white/90 shadow-[0_18px_50px_-18px_rgba(5,12,40,0.6)]">
                  <span className="relative inline-block">
                    <span className="ob-demo-select absolute inset-x-0 inset-y-[-2px] rounded bg-white/30" />
                    <span className="relative">Median survival rose from 11 to 17 months.</span>
                  </span>
                  <span className="ob-demo-pill flex w-max items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#274AC4]">
                    <LinkIcon size={11} weight="bold" /> nejm.org, saved
                  </span>
                </span>
              </span>
              <span className="ob-rise relative inline-flex" style={rise(3)}>
                <span aria-hidden className="ob-cta-ring absolute inset-0 rounded-full bg-white" />
                <span className="relative inline-flex h-12 items-center gap-3 rounded-full bg-white pl-7 pr-1.5 text-sm font-semibold text-[#274AC4] shadow-lg">
                  Tap to begin
                  <span className="flex w-9 h-9 items-center justify-center rounded-full bg-[#325FEC]/10">
                    <ArrowRight size={15} weight="bold" aria-hidden />
                  </span>
                </span>
              </span>
            </span>

            {/* Edges: clips and keys, dimmed and pushed out so the centre reads first */}
            <span aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
              <span className="ob-drift absolute left-[3%] top-[14%] w-56 opacity-70 rounded-2xl border border-white/20 bg-white/10 p-3.5" style={{ ['--ob-rot' as string]: '-4deg' }}>
                <span className="flex items-center gap-2 text-[11px] font-semibold text-white/80"><Quotes size={14} weight="bold" /> Text clip</span>
                <span className="mt-2 block text-xs leading-snug text-white">“Median survival rose from 11 to 17 months.”</span>
                <span className="mt-2 flex items-center gap-1 text-[11px] font-mono text-white/60"><LinkIcon size={11} weight="bold" /> nejm.org</span>
              </span>
              <span className="ob-drift absolute left-[5%] bottom-[12%] w-48 opacity-60 rounded-2xl border border-white/20 bg-white/[0.08] p-3" style={{ animationDelay: '1.4s', ['--ob-rot' as string]: '3deg' }}>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80"><FilePdf size={13} weight="bold" /> Paper.pdf</span>
                <span className="mt-2 block space-y-1">
                  <span className="block h-1 rounded bg-white/25" />
                  <span className="block h-1 w-4/5 rounded bg-white/45" />
                  <span className="block h-1 w-3/5 rounded bg-white/25" />
                </span>
              </span>
              <span className="ob-drift absolute right-[3%] top-[12%] w-60 opacity-70 rounded-2xl border border-white/20 bg-white/[0.12] p-3" style={{ animationDelay: '0.7s', ['--ob-rot' as string]: '3deg' }}>
                <span className="flex items-center gap-2 text-[11px] font-semibold text-white/80"><SelectionPlus size={14} weight="bold" /> Block clip</span>
                <span className="mt-2 grid grid-cols-3 gap-1">
                  {['Plan', 'Seats', 'Price', 'Free', '1', '$0', 'Team', '10', '$12'].map((c, i) => (
                    <span key={i} className={`rounded px-1.5 py-1 text-[10px] ${i < 3 ? 'bg-white/25 font-semibold text-white' : 'bg-white/10 text-white/80'}`}>{c}</span>
                  ))}
                </span>
              </span>
              <span className="ob-drift absolute right-[5%] bottom-[12%] w-60 opacity-60 rounded-2xl border border-white/20 bg-white/10 p-3" style={{ animationDelay: '2.1s', ['--ob-rot' as string]: '-3deg' }}>
                <span className="flex items-center gap-2 text-[11px] font-semibold text-white/80"><Sparkle size={14} weight="bold" /> Ask AI</span>
                <span className="mt-2 block text-xs leading-snug text-white">Survival improved to 17 months <span className="font-mono text-white/70">[1]</span></span>
                <span className="mt-2 flex gap-1.5">
                  {['Vancouver', 'APA', 'AMA'].map((c) => (
                    <span key={c} className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] text-white/90">{c}</span>
                  ))}
                </span>
              </span>
              {([['Alt+S', '24%', '10%', 0], ['Alt+B', '17%', '52%', 1.6], ['Alt+C', '78%', '48%', 3.1], ['Alt+P', '70%', '84%', 2.3]] as const).map(([k, l, t, d]) => (
                <span
                  key={k}
                  className="ob-drift absolute flex items-center rounded-lg border border-white/25 bg-white/10 px-2 py-1 font-mono text-[11px] text-white/70"
                  style={{ left: l, top: t, animationDelay: `${d}s` }}
                >
                  {k}
                </span>
              ))}
            </span>
          </button>
        )}

        {step > 0 && (
          <div
            className={`flex flex-col flex-1 min-h-0 transition-colors duration-300 ob-grid ob-glow-${step} ${
              step === 1
                ? 'bg-[#EDF1F7] dark:bg-[#0C0C0E]'
                : step === 2
                  ? 'bg-[#E4EBF7] dark:bg-[#101013]'
                  : 'bg-[#F2F5FA] dark:bg-[#15171C]'
            }`}
          >
            {/* Progress */}
            <div className="w-full max-w-6xl mx-auto flex items-center gap-3 px-6 sm:px-10 pt-6 pb-3 pr-16">
              <ResearchieLogo className="w-6 h-6 text-[#325FEC] dark:text-[#8DB4FF]" />
              <ol className="flex items-center gap-1.5" aria-label="Steps">
                {STEP_LABELS.map((label, i) =>
                  i === 0 ? null : (
                    <li key={label}>
                      <button
                        type="button"
                        onClick={() => go(i)}
                        aria-label={`${label}, step ${i} of ${last}`}
                        aria-current={step === i ? 'step' : undefined}
                        className={`h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                          step === i ? 'w-12 bg-[#325FEC] dark:bg-[#8DB4FF]' : i < step ? 'w-7 bg-[#325FEC]/50' : 'w-7 bg-[#C5D3EA] dark:bg-white/15'
                        }`}
                      />
                    </li>
                  )
                )}
              </ol>
              <span className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                {step} / {last}
              </span>
              {status.known && (
                <span data-testid="setup-count" className="ml-auto hidden sm:inline text-xs font-mono text-slate-500 dark:text-zinc-400">
                  {status.doneCount} of {status.total} set up
                </span>
              )}
            </div>

            <div key={step} className="flex-1 min-h-0 overflow-y-auto animate-fadeIn">
              <div className={`w-full max-w-6xl mx-auto min-h-full flex flex-col ${step === 1 ? 'justify-start pt-2' : 'justify-center'} px-6 sm:px-10 pb-6`}>
                {/* 1: Set up. Pick a task on the left, do it on the right. */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      {heading('Set up in two steps', 'text-3xl sm:text-4xl')}
                      <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 mt-2 max-w-xl">
                        The extension brings clips in. An AI key is optional and only for Ask AI and drafts.
                      </p>
                    </div>
                    <div className="grid lg:grid-cols-[18rem_1fr] gap-5 items-start">
                      <div role="tablist" aria-label="Setup tasks" className="flex lg:flex-col gap-3">
                        {([
                          { id: 'extension', icon: PuzzlePiece, label: 'Chrome extension', state: status.extension, note: 'Needed to clip' },
                          { id: 'ai', icon: Key, label: 'AI key', state: status.ai, note: 'Optional, bring your own' },
                        ] as const).map((r) => {
                          const Icon = r.icon;
                          const active = setupRow === r.id;
                          return (
                            <button
                              key={r.id}
                              role="tab"
                              type="button"
                              id={`setup-tab-${r.id}`}
                              aria-selected={active}
                              aria-controls="setup-panel"
                              onClick={() => setSetupRow(r.id)}
                              className={`flex-1 lg:flex-none text-left rounded-2xl border p-4 cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                active
                                  ? 'border-[#325FEC] bg-white dark:bg-[#325FEC]/15 shadow-[0_10px_30px_-12px_rgba(50,95,236,0.45)]'
                                  : 'border-transparent bg-[#DDE5F0] dark:bg-[#18181B] hover:bg-white dark:hover:bg-[#1C1C20]'
                              }`}
                            >
                              <span className="flex items-center gap-2 text-base font-display font-bold">
                                <Icon size={18} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" aria-hidden />
                                {r.label}
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-1">{r.note}</span>
                              <span className="block mt-2">
                                <StatusBadge state={r.state} todoText={r.id === 'extension' && status.tokenMade ? 'Not connected yet' : undefined} />
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div id="setup-panel" role="tabpanel" aria-labelledby={`setup-tab-${setupRow}`} className="rounded-3xl border border-[#D2DCEA] dark:border-white/10 bg-white dark:bg-[#18181B] shadow-sm p-3 min-w-0">
                        {setupRow === 'extension' ? <ExtensionIllustration /> : <KeyIllustration />}
                        <div className="p-3 sm:p-4">
                          {setupRow === 'extension' ? (
                            <div className="grid xl:grid-cols-2 gap-5">
                              <div className="space-y-3">
                                <p className="text-sm text-slate-500 dark:text-zinc-400">Chrome, Edge or Brave on a computer. Installed by hand for now.</p>
                                <a
                                  href="/researchie-extension.zip"
                                  download="researchie-extension.zip"
                                  className="group inline-flex items-center gap-2.5 h-11 pl-6 pr-1.5 rounded-full bg-[#325FEC] hover:bg-[#274AC4] text-white text-sm font-semibold shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                                >
                                  <span>Download extension (.zip)</span>
                                  <span className="flex w-7 h-7 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-px">
                                    <DownloadSimple size={14} weight="bold" aria-hidden />
                                  </span>
                                </a>
                                <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700 dark:text-zinc-300">
                                  <li>Right-click the zip, Extract All. Keep the folder.</li>
                                  <li>
                                    Open <code className="font-mono text-sm px-1 py-0.5 rounded bg-[#EEF3F8] dark:bg-white/10">chrome://extensions</code>, turn on Developer mode, press Load unpacked, pick the folder.
                                  </li>
                                  <li>Pin Researchie from the puzzle-piece menu.</li>
                                  <li>Copy your token. In the extension click the link icon, paste it, press Connect.</li>
                                </ol>
                                <p className="text-sm text-slate-500 dark:text-zinc-400">If skipped: you can still add clips by hand and read PDFs, but nothing arrives from the web.</p>
                              </div>
                              <div style={{ zoom: 1.2 }}><ExtensionConnectionSettings defaultOpen /></div>
                            </div>
                          ) : (
                            <div className="grid xl:grid-cols-2 gap-5">
                              <div className="space-y-3">
                                <div className="rounded-2xl border border-[#325FEC]/30 bg-[#325FEC]/[0.06] p-3.5 space-y-2.5">
                                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#274AC4] dark:text-[#8DB4FF]">
                                    <Star size={13} weight="fill" aria-hidden /> Get a free Groq key
                                  </div>
                                  <ol className="list-decimal pl-5 space-y-1.5 text-sm text-slate-700 dark:text-zinc-300">
                                    <li>
                                      Open{' '}
                                      <a href={PROVIDERS.groq.keysUrl} target="_blank" rel="noreferrer" className="text-[#325FEC] dark:text-[#8DB4FF] underline">
                                        console.groq.com/keys
                                      </a>{' '}
                                      and sign in. The free tier is enough to start.
                                    </li>
                                    <li>Press Create API Key and copy it. It is shown once.</li>
                                    <li>Paste it on the right and press Save and connect.</li>
                                  </ol>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-zinc-400">If skipped: Ask AI and Synthesize say “Add your AI key in Settings to use this feature.” You can add it later.</p>
                              </div>
                              <div style={{ zoom: 1.2 }}><AiProviderSettings /></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2: What it is. Cards climb like stairs, joined by a travelling dot. */}
                {step === 2 && (
                  <div className="relative space-y-8 pt-2">
                    <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 w-[28rem] h-[28rem] rounded-full bg-[#325FEC]/25 dark:hidden blur-3xl" />
                    <div className="relative grid lg:grid-cols-[1fr_22rem] gap-8 items-center">
                      <div>
                        {heading('Clip. Keep. Ask.', 'text-4xl sm:text-6xl text-[#0F172A] dark:text-white leading-[1.05]')}
                        <p className="text-base text-slate-600 dark:text-white/65 mt-4 max-w-md">A workbench for web research. Nothing you save loses its source.</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          {[
                            { icon: Rows, label: 'Feed' },
                            { icon: Graph, label: 'Canvas' },
                            { icon: FileText, label: 'Document' },
                          ].map((v, i) => {
                            const Icon = v.icon;
                            return (
                              <span key={v.label} className="ob-rise inline-flex items-center gap-1.5 rounded-full border border-[#C5D3EA] dark:border-white/15 bg-white/70 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-white/80" style={rise(i + 4)}>
                                <Icon size={14} weight="bold" aria-hidden /> {v.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <ClipDemo />
                    </div>
                    <ul className="relative grid md:grid-cols-3 gap-5 items-start">
                      {WHAT_IT_IS.map((c, i) => {
                        const Icon = c.icon;
                        return (
                          <li key={c.title} className={`ob-rise relative ${i === 1 ? 'md:mt-8' : i === 2 ? 'md:mt-16' : ''}`} style={rise(i)}>
                            <div className="rounded-[1.75rem] bg-[#325FEC]/[0.07] dark:bg-white/[0.04] p-1.5 ring-1 ring-[#325FEC]/10 dark:ring-white/10">
                              <div className="flex flex-col gap-3 rounded-[calc(1.75rem-0.375rem)] bg-white dark:bg-[#18181B] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.tone}`}>
                                  <Icon size={22} weight="bold" aria-hidden />
                                </span>
                                <div>
                                  <h3 className="text-xl font-display font-bold text-[#0F172A] dark:text-white">{c.title}</h3>
                                  <p className="text-xs text-slate-600 dark:text-white/65 mt-1.5 leading-relaxed">{c.body}</p>
                                </div>
                                <div className="ob-float" style={{ animationDelay: `${i * 0.8}s` }}>
                                  {c.sample}
                                </div>
                              </div>
                            </div>
                            {i < 2 && (
                              <span aria-hidden className="hidden md:flex absolute -right-[1.35rem] top-10 z-10 w-8 h-8 items-center justify-center rounded-full bg-[#325FEC] text-white shadow-lg">
                                <ArrowRight size={14} weight="bold" />
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="ob-rise relative text-xs text-slate-500 dark:text-white/50" style={rise(7)}>
                      Work in Feed, Canvas (a free-form board) or Document (your own PDFs). It is in testing: tell us what breaks.
                    </p>
                  </div>
                )}

                {/* 3: Use cases and how to use. Light slate, a rail on the left, a timeline on the right. */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>{heading('Pick the one that sounds like you', 'text-3xl sm:text-4xl')}</div>
                    <div className="grid lg:grid-cols-[17rem_1fr] gap-5 items-start">
                      <div role="tablist" aria-label="Use cases" aria-orientation="vertical" className="flex lg:flex-col gap-1 overflow-x-auto rounded-3xl bg-[#DDE5F0] dark:bg-[#27272A] p-2">
                        {USE_CASES.map((c, i) => {
                          const Icon = c.icon;
                          const active = i === caseIndex;
                          return (
                            <button
                              key={c.title}
                              role="tab"
                              type="button"
                              id={`case-tab-${i}`}
                              aria-selected={active}
                              aria-controls="case-panel"
                              tabIndex={active ? 0 : -1}
                              onClick={() => setCaseIndex(i)}
                              onKeyDown={(e) => {
                                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                                e.preventDefault();
                                const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1;
                                const n = (i + d + USE_CASES.length) % USE_CASES.length;
                                setCaseIndex(n);
                                document.getElementById(`case-tab-${n}`)?.focus();
                              }}
                              className={`ob-rise flex items-center gap-2.5 whitespace-nowrap lg:whitespace-normal text-left rounded-2xl px-3.5 py-3 text-sm font-semibold cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                                active
                                  ? 'bg-white dark:bg-[#0C0C0E] text-[#274AC4] dark:text-[#8DB4FF] shadow-sm'
                                  : 'text-slate-600 dark:text-zinc-400 hover:text-[#0F172A] dark:hover:text-white'
                              }`}
                              style={rise(i)}
                            >
                              <Icon size={16} weight="bold" aria-hidden className="flex-shrink-0" />
                              {c.title}
                            </button>
                          );
                        })}
                      </div>

                      <div key={caseIndex} id="case-panel" role="tabpanel" aria-labelledby={`case-tab-${caseIndex}`} className="animate-fadeIn rounded-3xl bg-[#325FEC]/[0.06] dark:bg-white/[0.04] p-1.5 ring-1 ring-[#325FEC]/10 dark:ring-white/10 min-w-0">
                        <div className="rounded-[calc(1.5rem-0.375rem)] bg-white dark:bg-[#0C0C0E] p-6 sm:p-8 space-y-6">
                          <div className="flex items-start gap-4">
                            <span className="flex-shrink-0 w-14 h-14 rounded-2xl bg-[#325FEC] text-white flex items-center justify-center">
                              <UcIcon size={26} weight="bold" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <h3 className="text-2xl font-display font-bold leading-snug">{uc.title}</h3>
                              <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500">{uc.who}</p>
                              <p className="text-base text-slate-600 dark:text-zinc-400 leading-relaxed mt-2 max-w-2xl">{uc.what}</p>
                            </div>
                          </div>
                          {/* A timeline, not cards: one line that draws down, a node per step. */}
                          <ol className="relative ml-1 pl-9 space-y-5">
                            <span aria-hidden className="ob-line absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[#325FEC] via-[#325FEC]/40 to-transparent" />
                            {uc.steps.map((t, i) => (
                              <li key={t} className="ob-rise relative" style={rise(i + 1)}>
                                <span aria-hidden className="absolute -left-9 top-0 flex w-6 h-6 items-center justify-center rounded-full bg-white dark:bg-[#0C0C0E] ring-2 ring-[#325FEC] text-[10px] font-mono font-semibold text-[#325FEC] dark:text-[#8DB4FF]">
                                  {i + 1}
                                </span>
                                <span className="sr-only">Step {i + 1}: </span>
                                <p className="text-sm sm:text-base leading-relaxed text-slate-800 dark:text-zinc-200 pt-px">{t}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#D2DCEA] dark:border-white/10">
              <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-3 px-6 sm:px-10 py-4">
                <button
                  type="button"
                  onClick={() => go(step - 1)}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} weight="bold" aria-hidden /> Back
                </button>
                <div className="flex items-center gap-3">
                  {step === 1 && (
                    <button
                      type="button"
                      onClick={() => go(2)}
                      className="h-10 px-4 rounded-full text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      I’ll do this later
                    </button>
                  )}
                  {step === last ? (
                    <span className="relative inline-flex">
                      <span aria-hidden className="ob-cta-ring absolute inset-0 rounded-full bg-[#325FEC]" />
                      <button
                        type="button"
                        data-testid="welcome-next"
                        onClick={onClose}
                        className="ob-cta group relative inline-flex items-center gap-3 h-12 pl-7 pr-1.5 rounded-full bg-[#325FEC] hover:bg-[#274AC4] text-white text-sm font-semibold shadow-[0_12px_30px_-10px_rgba(50,95,236,0.7)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                      >
                        <span>Start using Researchie</span>
                        <span className="flex w-9 h-9 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px">
                          <ArrowRight size={16} weight="bold" aria-hidden />
                        </span>
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid="welcome-next"
                      onClick={() => go(step + 1)}
                      className="group inline-flex items-center gap-2.5 h-11 pl-6 pr-1.5 rounded-full text-sm font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97] cursor-pointer"
                    >
                      Continue
                      <span className="flex w-8 h-8 items-center justify-center rounded-full bg-white/20 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                        <ArrowRight size={14} weight="bold" aria-hidden />
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// ─── Setup illustrations (CSS loops, reduced-motion safe) ────────────────────
// Download the zip, it travels into the browser, the puzzle piece drops into the toolbar, Send appears.
const ExtensionIllustration: React.FC = () => (
  <div
    role="img"
    aria-label="Animation: the extension zip is downloaded, the Researchie puzzle piece lands in the browser toolbar, and a Send button appears on the page."
    className="relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br from-[#DCE7FA] to-[#EEF3F8] dark:from-[#14224F] dark:to-[#101018]"
  >
    <div aria-hidden className="absolute left-5 top-1/2 -translate-y-1/2 flex w-20 flex-col items-center gap-1 rounded-xl bg-white dark:bg-[#0C0C0E] px-3 py-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <DownloadSimple size={20} weight="bold" className="text-[#325FEC] dark:text-[#8DB4FF]" />
      <span className="text-[9px] font-mono text-slate-500 dark:text-zinc-400">extension.zip</span>
    </div>
    <span aria-hidden className="ob-ill-travel absolute left-[6.75rem] top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[#325FEC]" />
    <div aria-hidden className="absolute left-[6.75rem] right-[calc(100%-10rem)] top-1/2 border-t border-dashed border-[#325FEC]/40" />
    <div aria-hidden className="absolute right-5 top-3 bottom-3 left-[10rem] rounded-xl bg-white dark:bg-[#0C0C0E] shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-center gap-2 border-b border-[#E3EAF3] dark:border-white/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-white/20" />
        <span className="h-4 flex-1 rounded-full bg-[#EEF3F8] dark:bg-white/10" />
        <span className="relative flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-[#325FEC]/40">
          <span className="ob-ill-drop absolute text-[#325FEC] dark:text-[#8DB4FF]"><PuzzlePiece size={16} weight="fill" /></span>
          <span className="ob-ill-pop absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle size={11} weight="fill" /></span>
        </span>
      </div>
      <div className="space-y-1.5 p-2.5">
        <span className="block h-1.5 w-4/5 rounded bg-slate-200 dark:bg-white/15" />
        <span className="ob-ill-pop inline-flex items-center rounded-full bg-[#325FEC] px-2.5 py-1 text-[10px] font-semibold text-white">Send</span>
      </div>
    </div>
  </div>
);

// A key slides in, the field fills with dots, the check pops.
const KeyIllustration: React.FC = () => (
  <div
    role="img"
    aria-label="Animation: a key slides into a field, the key is typed in as hidden dots, and a check mark confirms it is saved."
    className="relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br from-[#E6E3FB] to-[#EEF3F8] dark:from-[#251B4F] dark:to-[#101018]"
  >
    <div aria-hidden className="absolute inset-x-6 top-1/2 -translate-y-1/2 max-w-md mx-auto">
      <div className="relative flex items-center gap-3 rounded-2xl bg-white dark:bg-[#0C0C0E] px-4 py-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <span className="ob-ill-key text-[#7C5CFC] dark:text-[#B4A0FF]"><Key size={22} weight="fill" /></span>
        <span className="relative h-2.5 flex-1 overflow-hidden">
          <span className="ob-ill-type absolute inset-0 flex items-center gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-slate-700 dark:bg-zinc-200" />
            ))}
          </span>
        </span>
        <span className="ob-ill-pop flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white"><CheckCircle size={16} weight="fill" /></span>
      </div>
      <div className="mt-2 flex gap-2">
        {['Groq', 'Cerebras'].map((n) => (
          <span key={n} className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 ring-1 ring-black/5 dark:ring-white/10">
            <Star size={10} weight="fill" className="text-[#325FEC] dark:text-[#8DB4FF]" /> {n}
          </span>
        ))}
      </div>
    </div>
  </div>
);
