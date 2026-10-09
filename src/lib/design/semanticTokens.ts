/**
 * SEMANTIC DESIGN TOKENS
 * Strict Layer A (Neutral Surfaces) & Layer B (Semantic Role Tokens)
 * Standards: Contrast >= 4.5:1 body, >= 3:1 UI in both light & dark themes.
 * Anti-slop: Color carries meaning, never decoration.
 */

export const SEMANTIC_TOKENS = {
  // Layer A: Neutral Surfaces & Hierarchy
  surfaces: {
    base: 'bg-[#FAFBFD] dark:bg-[#09090B]',
    elevated: 'bg-white dark:bg-[#0E0E10]',
    inset: 'bg-[#F4F6F9] dark:bg-[#050507]',
    hover: 'hover:bg-[#EEF3F8] dark:hover:bg-[#18181B]',
  },
  borders: {
    subtle: 'border-[#E2E8F0] dark:border-[#222225]',
    strong: 'border-[#CBD5E1] dark:border-[#333338]',
    active: 'border-[#325FEC] dark:border-[#518FFF]',
  },
  text: {
    primary: 'text-[#0F172A] dark:text-[#F8FAFC]',
    secondary: 'text-[#475569] dark:text-[#94A3B8]',
    muted: 'text-[#64748B] dark:text-[#71717A]',
    accent: 'text-[#325FEC] dark:text-[#518FFF]',
  },

  // Layer B: Semantic Roles (Strict Grayscale Surfaces + Semantic Accents)
  roles: {
    evidence: {
      border: 'border-l-2 border-l-[#325FEC] dark:border-l-[#518FFF]',
      bg: 'bg-slate-50 dark:bg-[#0E0E10]',
      tag: 'text-[#325FEC] dark:text-[#518FFF]',
      label: 'Evidence',
    },
    sources: {
      chipBg: 'bg-slate-100 dark:bg-zinc-800',
      chipBorder: 'border border-slate-200 dark:border-zinc-700',
      chipText: 'text-slate-700 dark:text-zinc-300',
      label: 'Source',
    },
    success: {
      border: 'border-slate-200 dark:border-[#222225]',
      bg: 'bg-slate-50 dark:bg-[#0E0E10]',
      text: 'text-slate-800 dark:text-zinc-200',
      icon: 'text-emerald-600 dark:text-emerald-400',
      label: 'Verified',
    },
    warning: {
      border: 'border-slate-200 dark:border-[#222225]',
      bg: 'bg-slate-50 dark:bg-[#0E0E10]',
      text: 'text-slate-800 dark:text-zinc-200',
      icon: 'text-amber-600 dark:text-amber-400',
      label: 'Uncertain / Conflict',
    },
    danger: {
      border: 'border-slate-200 dark:border-[#222225]',
      bg: 'bg-slate-50 dark:bg-[#0E0E10]',
      text: 'text-slate-800 dark:text-zinc-200',
      icon: 'text-rose-600 dark:text-rose-400',
      label: 'Error',
    },
    ai: {
      badge: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
      icon: 'text-[#325FEC] dark:text-[#518FFF]',
      label: 'Researchie AI',
    },
    user: {
      badge: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
      icon: 'text-slate-600 dark:text-zinc-400',
      label: 'User',
    },
    plugin: {
      badge: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
      icon: 'text-indigo-600 dark:text-indigo-400',
      label: 'Extension',
    },
    canvas: {
      badge: 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700',
      icon: 'text-sky-600 dark:text-sky-400',
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
