import React from 'react';

// Small spot illustrations for empty and status screens. They share one language with the dashboard hero:
// the blue project folder, white clip cards, one blue accent. Each is sized by its caller to fit its box, and
// stays quiet: no loops except where a caller adds `ob-drift`.

const card = 'fill-white dark:fill-[#1B2132] stroke-[#D5DDEC] dark:stroke-white/15';
const line = 'fill-[#DCE3EF] dark:fill-white/20';
const accent = 'fill-[#325FEC]';
const ring = 'stroke-[#325FEC]';

/** Empty feed: a folder with room for the first clip, and the dashed way in. */
export const EmptyFeedIllustration: React.FC<{ className?: string }> = ({ className = 'w-32 h-24 mx-auto mb-3' }) => (
  <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <ellipse cx="70" cy="90" rx="52" ry="4.5" className="fill-[#325FEC]/10 dark:fill-black/30" />
    <path d="M22 48 a8 8 0 0 1 8 -8 h22 a6 6 0 0 1 4 1.6 l4 4 a6 6 0 0 0 4 1.6 h40 a8 8 0 0 1 8 8 v32 a8 8 0 0 1 -8 8 h-74 a8 8 0 0 1 -8 -8 z" className={`fill-[#325FEC]/15 ${ring}`} strokeWidth="1.6" strokeLinejoin="round" />
    <g className="ob-drift" style={{ ['--ob-rot' as string]: '-4deg' }}>
      <rect x="42" y="14" width="44" height="46" rx="6" className={card} strokeWidth="1.2" />
      <rect x="49" y="22" width="18" height="3.5" rx="1.75" className={accent} />
      <rect x="49" y="31" width="30" height="3" rx="1.5" className={line} />
      <rect x="49" y="38" width="24" height="3" rx="1.5" className={line} />
    </g>
    <path d="M18 60 a8 8 0 0 1 8 -8 h88 a8 8 0 0 1 8 8 v22 a8 8 0 0 1 -8 8 h-88 a8 8 0 0 1 -8 -8 z" className="fill-white dark:fill-[#18181B]" strokeWidth="1.8" stroke="#325FEC" strokeLinejoin="round" />
    <rect x="28" y="62" width="30" height="4.5" rx="2.25" className={accent} />
    <rect x="28" y="72" width="52" height="3" rx="1.5" className={line} />
    <path className="stroke-[#8FA6DA] dark:stroke-white/40 ob-dash" d="M112 8 C 108 22, 100 34, 90 44" strokeWidth="1.4" strokeDasharray="3.5 4.5" strokeLinecap="round" />
    <rect x="102" y="2" width="28" height="12" rx="6" className={accent} />
    <text x="116" y="10.5" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="white" fontFamily="sans-serif">Send</text>
  </svg>
);

/** Trash: a clip waiting above a small bin. Kept short, because the modal is a narrow list. */
export const EmptyTrashIllustration: React.FC<{ className?: string }> = ({ className = 'w-24 h-16 mx-auto' }) => (
  <svg viewBox="0 0 96 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <ellipse cx="48" cy="60" rx="30" ry="3" className="fill-[#325FEC]/10 dark:fill-black/30" />
    <g className="ob-drift" style={{ ['--ob-rot' as string]: '-6deg' }}>
      <rect x="30" y="4" width="30" height="26" rx="5" className={card} strokeWidth="1.2" />
      <rect x="36" y="11" width="12" height="3" rx="1.5" className={accent} />
      <rect x="36" y="18" width="18" height="2.6" rx="1.3" className={line} />
    </g>
    <path d="M26 30 h44 l-3 26 a4 4 0 0 1 -4 3.4 h-30 a4 4 0 0 1 -4 -3.4 z" className="fill-white dark:fill-[#18181B]" stroke="#94A3B8" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M24 30 h48" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    <path d="M40 38 v14 M48 38 v14 M56 38 v14" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** Document library empty: a PDF page drawn as a dashed drop slot with an upload arrow. */
export const EmptyLibraryIllustration: React.FC<{ className?: string }> = ({ className = 'w-20 h-14 mx-auto' }) => (
  <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <rect x="22" y="4" width="36" height="46" rx="5" className="fill-white/60 dark:fill-white/5 stroke-[#8FA6DA] dark:stroke-white/30" strokeWidth="1.4" strokeDasharray="4 4" />
    <rect x="29" y="12" width="14" height="3" rx="1.5" className={line} />
    <rect x="29" y="19" width="22" height="2.6" rx="1.3" className={line} />
    <g className="ob-drift">
      <circle cx="40" cy="36" r="8" className={accent} />
      <path d="M40 40.5 v-9 M36 35 l4 -4 l4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

/** Sidebar project list empty: one small folder. */
export const EmptyFolderIllustration: React.FC<{ className?: string }> = ({ className = 'w-12 h-10 mx-auto' }) => (
  <svg viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M5 12 a4 4 0 0 1 4 -4 h10 a3 3 0 0 1 2 .8 l2.4 2.4 a3 3 0 0 0 2 .8 h13.6 a4 4 0 0 1 4 4 v16 a4 4 0 0 1 -4 4 h-30 a4 4 0 0 1 -4 -4 z" className="fill-[#325FEC]/15" stroke="#325FEC" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M5 19 a4 4 0 0 1 4 -4 h30 a4 4 0 0 1 4 4 v13 a4 4 0 0 1 -4 4 h-30 a4 4 0 0 1 -4 -4 z" className="fill-white dark:fill-[#18181B]" stroke="#325FEC" strokeWidth="1.6" strokeLinejoin="round" />
    <rect x="11" y="22" width="14" height="3" rx="1.5" className={accent} />
  </svg>
);

/** Login: the flow in one line. A page, a clip, a folder. Narrow, so it sits above the card without competing. */
export const AuthIllustration: React.FC<{ className?: string }> = ({ className = 'w-56 h-16 mx-auto' }) => (
  <svg viewBox="0 0 224 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <rect x="4" y="8" width="56" height="48" rx="7" className={card} strokeWidth="1.2" />
    <rect x="12" y="17" width="40" height="3" rx="1.5" className={line} />
    <rect x="12" y="26" width="40" height="8" rx="2.5" className="fill-[#325FEC]/25" />
    <rect x="15" y="28.5" width="30" height="3" rx="1.5" className="fill-[#325FEC]/70" />
    <rect x="12" y="40" width="26" height="3" rx="1.5" className={line} />
    <path className="stroke-[#8FA6DA] dark:stroke-white/40 ob-dash" d="M64 32 H92" strokeWidth="1.5" strokeDasharray="3.5 4.5" strokeLinecap="round" />
    <rect x="96" y="14" width="40" height="36" rx="6" className={card} strokeWidth="1.2" />
    <rect x="103" y="21" width="14" height="3.4" rx="1.7" className={accent} />
    <rect x="103" y="29" width="26" height="3" rx="1.5" className={line} />
    <rect x="103" y="36" width="20" height="3" rx="1.5" className={line} />
    <path className="stroke-[#8FA6DA] dark:stroke-white/40 ob-dash" d="M140 32 H160" strokeWidth="1.5" strokeDasharray="3.5 4.5" strokeLinecap="round" />
    <path d="M164 24 a6 6 0 0 1 6 -6 h14 a4 4 0 0 1 2.6 1 l3 3 a4 4 0 0 0 2.6 1 h12 a6 6 0 0 1 6 6 v20 a6 6 0 0 1 -6 6 h-40 a6 6 0 0 1 -6 -6 z" className="fill-[#325FEC]/15" stroke="#325FEC" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/** Share page: no access. A folder with a lock. */
export const LockedFolderIllustration: React.FC<{ className?: string }> = ({ className = 'w-20 h-14 mx-auto' }) => (
  <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M10 18 a6 6 0 0 1 6 -6 h14 a4 4 0 0 1 2.8 1.2 l3.4 3.4 a4 4 0 0 0 2.8 1.2 h22 a6 6 0 0 1 6 6 v22 a6 6 0 0 1 -6 6 h-45 a6 6 0 0 1 -6 -6 z" className="fill-[#325FEC]/15" stroke="#325FEC" strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="31" y="28" width="18" height="14" rx="3.5" className={accent} />
    <path d="M35 28 v-4 a5 5 0 0 1 10 0 v4" stroke="#325FEC" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="40" cy="35" r="1.8" fill="white" />
  </svg>
);

/** Share page: gone or private. A link broken in two. */
export const BrokenLinkIllustration: React.FC<{ className?: string }> = ({ className = 'w-20 h-14 mx-auto' }) => (
  <svg viewBox="0 0 80 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <rect x="6" y="20" width="28" height="16" rx="8" className="fill-white dark:fill-[#1B2132] stroke-[#94A3B8]" strokeWidth="2" />
    <rect x="46" y="20" width="28" height="16" rx="8" className="fill-white dark:fill-[#1B2132] stroke-[#94A3B8]" strokeWidth="2" />
    <path d="M36 28 h-2 M44 28 h2" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M38 12 l-2 8 M42 36 l2 8" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
