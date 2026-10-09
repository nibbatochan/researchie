'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatCircleDots, Article } from '@phosphor-icons/react';
import { ResearchieAILogo } from './ResearchieAILogo';
import { AISidebarTab } from './ResearchieAISidebar';

interface ResearchieAIFABProps {
  isOpen: boolean;
  onOpenSidebar: (tab: AISidebarTab) => void;
  onToggleSidebar: () => void;
  clipCount?: number;
}

export const ResearchieAIFAB: React.FC<ResearchieAIFABProps> = ({
  isOpen,
  onOpenSidebar,
  onToggleSidebar,
  clipCount = 0,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (isOpen) return null;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end select-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Popover Action Menu on Hover */}
      {isHovered && !isOpen && (
        <div className="mb-2.5 w-60 bg-white dark:bg-[#121214] border border-[#E2E5EB] dark:border-[#27272A] rounded-2xl shadow-2xl p-1.5 space-y-1 animate-popIn backdrop-blur-md">
          {/* Ask AI Option */}
          <button
            onClick={() => {
              setIsHovered(false);
              onOpenSidebar('ask');
            }}
            className="w-full text-left p-2.5 rounded-xl hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] transition-colors flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F1F4F9] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] text-[#0F172A] dark:text-zinc-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#325FEC] group-hover:text-white dark:group-hover:bg-[#518FFF] dark:group-hover:text-black transition-all">
              <ChatCircleDots size={17} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[#0F172A] dark:text-white">
                  Ask AI
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F1F4F9] dark:bg-[#18181B] text-slate-600 dark:text-zinc-400 border border-[#E2E5EB] dark:border-[#27272A]">
                  Chat
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate font-sans">
                Query {clipCount} clips & citations
              </p>
            </div>
          </button>

          {/* Summarize Option */}
          <button
            onClick={() => {
              setIsHovered(false);
              onOpenSidebar('summarize');
            }}
            className="w-full text-left p-2.5 rounded-xl hover:bg-[#F1F4F9] dark:hover:bg-[#18181B] transition-colors flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-[#F1F4F9] dark:bg-[#18181B] border border-[#E2E5EB] dark:border-[#27272A] text-[#0F172A] dark:text-zinc-100 flex items-center justify-center flex-shrink-0 group-hover:bg-[#325FEC] group-hover:text-white dark:group-hover:bg-[#518FFF] dark:group-hover:text-black transition-all">
              <Article size={17} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[#0F172A] dark:text-white">
                  Summarize
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F1F4F9] dark:bg-[#18181B] text-slate-600 dark:text-zinc-400 border border-[#E2E5EB] dark:border-[#27272A]">
                  Synthesis
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate font-sans">
                PRDs, memos & takeaways
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Main Round Floating Action Button */}
      <button
        onClick={onToggleSidebar}
        className={`w-13 h-13 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl hover:shadow-2xl cursor-pointer group relative ${
          isOpen
            ? 'bg-[#325FEC] dark:bg-[#518FFF] text-white dark:text-[#09090B] ring-4 ring-[#325FEC]/20 dark:ring-[#518FFF]/20 scale-105'
            : 'bg-white dark:bg-[#18181B] hover:bg-[#F8F9FB] dark:hover:bg-[#222226] text-[#325FEC] dark:text-[#518FFF] border-2 border-[#E2E5EB] dark:border-[#27272A] hover:border-[#325FEC] dark:hover:border-[#518FFF]'
        }`}
        title={isOpen ? 'Close Researchie AI' : 'Open Researchie AI Assistant'}
        aria-label="Researchie AI"
      >
        <div className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center transform group-hover:scale-110 transition-transform">
          <ResearchieAILogo
            className={`w-full h-full ${
              isOpen 
                ? 'text-white dark:text-[#09090B]' 
                : 'text-[#325FEC] dark:text-[#518FFF]'
            }`}
          />
        </div>
      </button>
    </div>
  );
};
