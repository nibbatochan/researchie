'use client';

import React from 'react';
import { ProjectIcon, isProjectShape } from './ProjectIcon';

interface ProjectAvatarProps {
  title: string;
  /** Stored value: 'initials', 'icon:<shape id>', 'photo:<data URL>', or a bare shape id (older projects). */
  folderIcon?: string | null;
  seed: string;
  color?: string;
  /** Diameter in px. The icon and initials scale with it. */
  size?: number;
  className?: string;
}

export function initialsOf(title: string): string {
  return title
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// The round container used for every project in the sidebar, the collapsed rail and the dashboard.
export const ProjectAvatar: React.FC<ProjectAvatarProps> = ({
  title,
  folderIcon,
  seed,
  color = '#325FEC',
  size = 24,
  className = '',
}) => {
  const base = `rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${className}`;
  const style = { width: size, height: size };

  if (folderIcon?.startsWith('photo:')) {
    return (
      <span className={base} style={style}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={folderIcon.slice(6)} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  const shape = folderIcon?.startsWith('icon:') ? folderIcon.slice(5) : folderIcon;
  if (isProjectShape(shape)) {
    return (
      <span className={`${base} bg-[#EEF3F8] dark:bg-[#18181B] border border-[#D2DCEA] dark:border-[#27272A]`} style={style}>
        <ProjectIcon shape={shape} color={color} seed={seed} size={Math.round(size * 0.55)} />
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-gradient-to-br from-[#325FEC] to-[#518FFF] text-white font-semibold`}
      style={{ ...style, fontSize: Math.max(9, Math.round(size * 0.4)) }}
    >
      {initialsOf(title) || '?'}
    </span>
  );
};
