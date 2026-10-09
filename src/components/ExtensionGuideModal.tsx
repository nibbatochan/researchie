'use client';

import React, { useState } from 'react';
import { X, Copy, Check, PuzzlePiece } from '@phosphor-icons/react';

interface ExtensionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionGuideModal: React.FC<ExtensionGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const extensionPath = 'd:\\product anatomy - molecule community\\projects\\research tool\\extension';

  if (!isOpen) return null;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-2xl p-6 shadow-2xl animate-popIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E5EB] dark:border-[#27272A] mb-4">
          <div className="flex items-center gap-2">
            <PuzzlePiece size={20} className="text-[#325FEC] dark:text-[#518FFF]" />
            <h2 className="text-base font-display font-bold text-[#0F172A] dark:text-white">
              Load Chrome Extension
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-[#0F172A] dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-zinc-300 leading-relaxed font-sans">
            Researchie's Chrome Extension captures web text, links, and DOM structures directly into your active workspace with zero context switching.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 bg-[#F8F9FB] dark:bg-[#09090B] p-3.5 rounded-xl border border-[#E2E5EB] dark:border-[#27272A]">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] font-mono font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                1
              </span>
              <div>
                <strong className="text-[#0F172A] dark:text-zinc-200 block mb-0.5">Open Extension Settings</strong>
                <span className="text-slate-500 dark:text-zinc-400">
                  Open Chrome and navigate to <code className="bg-slate-200 dark:bg-[#18181B] px-1.5 py-0.5 rounded text-[#325FEC] dark:text-[#518FFF] font-mono">chrome://extensions</code>
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#F8F9FB] dark:bg-[#09090B] p-3.5 rounded-xl border border-[#E2E5EB] dark:border-[#27272A]">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] font-mono font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                2
              </span>
              <div>
                <strong className="text-[#0F172A] dark:text-zinc-200 block mb-0.5">Enable Developer Mode</strong>
                <span className="text-slate-500 dark:text-zinc-400">
                  Toggle the <b>Developer mode</b> switch in the top-right corner.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#F8F9FB] dark:bg-[#09090B] p-3.5 rounded-xl border border-[#E2E5EB] dark:border-[#27272A]">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] font-mono font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                3
              </span>
              <div>
                <strong className="text-[#0F172A] dark:text-zinc-200 block mb-0.5">Click "Load unpacked" & Select Folder</strong>
                <span className="text-slate-500 dark:text-zinc-400 block mb-2">
                  Select the extension folder from your local workspace:
                </span>
                <div className="flex items-center gap-2 bg-white dark:bg-[#121214] px-2.5 py-1.5 rounded-lg border border-[#E2E5EB] dark:border-[#27272A]">
                  <code className="text-[11px] font-mono text-slate-700 dark:text-zinc-300 truncate flex-1">
                    {extensionPath}
                  </code>
                  <button
                    onClick={handleCopyPath}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#325FEC] dark:text-[#518FFF] hover:underline px-1.5 py-0.5 rounded bg-blue-50 dark:bg-[#18181B] transition-colors"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#F8F9FB] dark:bg-[#09090B] p-3.5 rounded-xl border border-[#E2E5EB] dark:border-[#27272A]">
              <span className="w-5 h-5 rounded-full bg-blue-50 dark:bg-[#18181B] text-[#325FEC] dark:text-[#518FFF] font-mono font-bold flex items-center justify-center text-[11px] flex-shrink-0">
                4
              </span>
              <div>
                <strong className="text-[#0F172A] dark:text-zinc-200 block mb-0.5">Highlight & Clip</strong>
                <span className="text-slate-500 dark:text-zinc-400">
                  Select text on any webpage and click the floating <b>Save</b> pill or press <kbd className="bg-slate-200 dark:bg-[#18181B] px-1.5 py-0.5 rounded text-[#325FEC] dark:text-[#518FFF] font-mono">Alt+S</kbd>.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[#E2E5EB] dark:border-[#27272A] mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-display font-semibold text-white bg-[#325FEC] hover:bg-[#274AC4] rounded-xl transition-colors shadow-sm"
          >
            Got it, Let's Research
          </button>
        </div>
      </div>
    </div>
  );
};
