/**
 * SEMANTIC DESIGN TOKENS
 * Strict Layer A (Neutral Surfaces) & Layer B (Semantic Role Tokens)
 * Standards: Contrast >= 4.5:1 body, >= 3:1 UI in both light & dark themes.
 * Anti-slop: Color carries meaning, never decoration.
 */

export const SEMANTIC_TOKENS = {
  // Layer A: Neutral Surfaces & Hierarchy
  surfaces: {
    base: 'bg-[#FAFBFD] dark:bg-[#121214]',
    elevated: 'bg-white dark:bg-[#18181B]',
    inset: 'bg-[#F4F6F9] dark:bg-[#09090B]',
    hover: 'hover:bg-[#EEF3F8] dark:hover:bg-[#202024]',
  },
  borders: {
    subtle: 'border-[#E2E8F0] dark:border-[#27272A]',
    strong: 'border-[#CBD5E1] dark:border-[#3F3F46]',
    active: 'border-[#325FEC] dark:border-[#518FFF]',
  },
  text: {
    primary: 'text-[#0F172A] dark:text-[#F8FAFC]',
    secondary: 'text-[#475569] dark:text-[#94A3B8]',
    muted: 'text-[#64748B] dark:text-[#71717A]',
    accent: 'text-[#325FEC] dark:text-[#518FFF]',
  },

  // Layer B: Semantic Roles
  roles: {
    evidence: {
      border: 'border-l-2 border-l-[#325FEC] dark:border-l-[#518FFF]',
      bg: 'bg-[#325FEC]/5 dark:bg-[#325FEC]/10',
      tag: 'text-[#325FEC] dark:text-[#518FFF]',
      label: 'Evidence',
    },
    sources: {
      chipBg: 'bg-[#EEF3F8] dark:bg-[#27272A]',
      chipBorder: 'border border-[#D2DCEA] dark:border-[#3F3F46]',
      chipText: 'text-[#475569] dark:text-[#CBD5E1]',
      label: 'Source',
    },
    success: {
      border: 'border-emerald-200 dark:border-emerald-800/60',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-800 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-400',
      label: 'Verified',
    },
    warning: {
      border: 'border-amber-200 dark:border-amber-800/60',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-800 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
      label: 'Uncertain / Conflict',
    },
    danger: {
      border: 'border-red-200 dark:border-red-800/60',
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-800 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
      label: 'Error',
    },
    ai: {
      badge: 'bg-blue-50 dark:bg-blue-950/60 text-[#325FEC] dark:text-[#518FFF] border border-blue-200 dark:border-blue-800/40',
      icon: 'text-[#325FEC] dark:text-[#518FFF]',
      label: 'Researchie AI',
    },
    user: {
      badge: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
      label: 'User',
    },
    plugin: {
      badge: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40',
      label: 'Extension',
    },
    canvas: {
      badge: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40',
      label: 'Canvas',
    },
  },

  // Dimension Scales (Anti-slop rules)
  radii: {
    sm: 'rounded-md',   // 6px
    md: 'rounded-xl',   // 10px
    lg: 'rounded-2xl',  // 14px
  },
  typography: {
    meta: 'text-[11px] leading-tight font-mono',
    body: 'text-[13px] leading-relaxed font-sans',
    heading: 'text-[15px] font-semibold font-display tracking-tight',
    title: 'text-[17px] font-bold font-display tracking-tight',
  },
} as const;
