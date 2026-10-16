'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  DownloadSimple,
  Copy,
  Check,
  PuzzlePiece,
  TextAa,
  SelectionPlus,
  Image as ImageIcon,
  LinkSimple,
  Info,
} from '@phosphor-icons/react';

interface GetExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = { title: string; body: string; copy?: boolean };

// One numbered list, grouped under three headings. Numbers run across the groups.
const GROUPS: { heading: string; hint: string; steps: Step[] }[] = [
  {
    heading: 'Download',
    hint: 'One minute',
    steps: [
      {
        title: 'Unzip the file',
        body: 'Right-click the downloaded zip and choose Extract All. Keep the new folder somewhere permanent, for example Documents. Chrome reads the extension from that folder, so do not delete it.',
      },
    ],
  },
  {
    heading: 'Install in Chrome',
    hint: 'Two minutes, once',
    steps: [
      {
        title: 'Open the extensions page',
        body: 'Open a new tab and go to chrome://extensions. Edge and Brave work the same way.',
        copy: true,
      },
      { title: 'Turn on Developer mode', body: 'Use the switch at the top right of that page.' },
      {
        title: 'Load the folder',
        body: 'Press Load unpacked and choose the folder called researchie-extension, the one with manifest.json inside.',
      },
      {
        title: 'Pin it',
        body: 'Click the puzzle-piece icon in the Chrome toolbar and pin Researchie so it stays visible.',
      },
    ],
  },
  {
    heading: 'Connect to your account',
    hint: 'Thirty seconds',
    steps: [
      {
        title: 'Copy your token, then paste it',
        body: 'In this app, open your profile menu, then Extension token, and press Copy token. Click the Researchie icon, click the link icon next to the on/off switch, paste the token and press Connect.',
      },
    ],
  },
];

const CAPABILITIES = [
  { icon: TextAa, label: 'Clip any text' },
  { icon: SelectionPlus, label: 'Pick whole blocks' },
  { icon: ImageIcon, label: 'Capture images' },
  { icon: LinkSimple, label: 'Keep the exact source' },
];

const TROUBLE = [
  {
    q: 'Chrome says "Manifest file is missing"',
    a: 'You chose the wrong folder. Open the unzipped folder and pick researchie-extension, the one that contains manifest.json.',
  },
  {
    q: 'The toast says "Not connected"',
    a: 'Copy a fresh token from the app (profile menu, Extension token) and connect again from the popup.',
  },
  {
    q: 'The extension disappeared after a restart',
    a: 'The folder was moved or deleted. Put it back, or unzip again and use Load unpacked.',
  },
];

export const GetExtensionModal: React.FC<GetExtensionModalProps> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<{ version: string; bytes: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let live = true;
    fetch('/extension-info.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && j && setInfo(j))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText('chrome://extensions');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the address is in the step text */
    }
  };

  let n = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-3 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="get-extension-title"
        data-testid="get-extension-modal"
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-4xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] overflow-hidden rounded-2xl border border-[#D2DCEA] dark:border-[#27272A] bg-[#FAFBFD] dark:bg-[#121214] text-[#0F172A] dark:text-[#FAFAFA] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-[#D2DCEA] dark:border-[#27272A]">
          <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#325FEC]/10 text-[#325FEC] dark:text-[#518FFF] flex items-center justify-center">
            <PuzzlePiece size={22} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="get-extension-title" className="text-base font-display font-bold tracking-tight">
              Researchie for Chrome
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Clip from any page straight into your projects. Installed by hand for now.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-500 hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-[17rem_1fr] gap-0">
            {/* Left: download */}
            <aside className="p-6 md:border-r border-b md:border-b-0 border-[#D2DCEA] dark:border-[#27272A] space-y-6">
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Latest version
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-display font-bold tracking-tight">
                    {info ? `v${info.version}` : 'v—'}
                  </span>
                  {info && (
                    <span className="text-xs font-mono text-slate-400 dark:text-zinc-500">
                      {Math.max(1, Math.round(info.bytes / 1024))} KB
                    </span>
                  )}
                </div>
                <a
                  href="/researchie-extension.zip"
                  download="researchie-extension.zip"
                  data-testid="download-extension"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs font-sans font-semibold bg-[#325FEC] hover:bg-[#274AC4] text-white shadow-sm transition-colors"
                >
                  <DownloadSimple size={15} weight="bold" />
                  <span>Download extension (.zip)</span>
                </a>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  For Chrome, Edge and Brave on a computer.
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  What it does
                </div>
                <ul className="space-y-2">
                  {CAPABILITIES.map(({ icon: Icon, label }) => (
                    <li key={label} className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-zinc-300">
                      <Icon size={15} className="text-[#325FEC] dark:text-[#518FFF]" />
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
                <Info size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  It needs access to the pages you clip from. Nothing is sent to your account until you connect it with your token and press clip.
                </span>
              </div>
            </aside>

            {/* Right: steps */}
            <div className="p-6 space-y-7">
              {GROUPS.map((g) => (
                <section key={g.heading} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-display font-bold tracking-tight">{g.heading}</h3>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">{g.hint}</span>
                  </div>
                  <ol className="rounded-xl border border-[#D2DCEA] dark:border-[#27272A] divide-y divide-[#D2DCEA] dark:divide-[#27272A] bg-white/60 dark:bg-[#18181B]/50">
                    {g.steps.map((s) => {
                      n += 1;
                      return (
                        <li key={s.title} className="flex gap-3.5 p-3.5">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#325FEC] text-white text-[11px] font-semibold flex items-center justify-center">
                            {n}
                          </span>
                          <div className="min-w-0 text-xs leading-relaxed">
                            <div className="font-semibold text-sm">{s.title}</div>
                            <div className="mt-0.5 text-slate-500 dark:text-zinc-400">{s.body}</div>
                            {s.copy && (
                              <button
                                type="button"
                                onClick={copyAddress}
                                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border border-[#D2DCEA] dark:border-[#27272A] hover:bg-[#EEF3F8] dark:hover:bg-[#1C1C20] cursor-pointer"
                              >
                                {copied ? <Check size={12} weight="bold" /> : <Copy size={12} />}
                                <span>{copied ? 'Copied' : 'chrome://extensions'}</span>
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          </div>

          {/* Footer sections */}
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 px-6 py-6 border-t border-[#D2DCEA] dark:border-[#27272A]">
            <section className="space-y-2">
              <h3 className="text-sm font-display font-bold tracking-tight">Updating later</h3>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                Download the new zip and extract it over the old folder. Then press the reload arrow on the Researchie card in chrome://extensions. Chrome may remind you about developer-mode extensions when it starts; leave the extension on.
              </p>
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-display font-bold tracking-tight">If something goes wrong</h3>
              <dl className="space-y-2.5">
                {TROUBLE.map((t) => (
                  <div key={t.q} className="text-xs leading-relaxed">
                    <dt className="font-semibold">{t.q}</dt>
                    <dd className="text-slate-500 dark:text-zinc-400">{t.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
