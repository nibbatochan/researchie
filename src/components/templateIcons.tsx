import React from 'react';
import { FileDashed, FileText } from '@phosphor-icons/react';

/** One generic document icon for every template, and a dashed page for Blank. */
export const TemplateIcon: React.FC<{ blank?: boolean; size?: number; className?: string }> = ({ blank, size = 16, className }) => {
  const Icon = blank ? FileDashed : FileText;
  return <Icon size={size} weight="duotone" className={className} aria-hidden />;
};
