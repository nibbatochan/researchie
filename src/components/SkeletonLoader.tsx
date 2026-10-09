'use client';

import React from 'react';

export const Shimmer = () => (
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent" />
);

export const AtomCardSkeleton: React.FC<{ mode?: 'clean' | 'detailed' }> = ({ mode = 'detailed' }) => {
  if (mode === 'clean') {
    return (
      <div className="relative overflow-hidden p-4 rounded-xl bg-white dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] shadow-xs space-y-2.5">
        <Shimmer />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-16 h-4 rounded-md bg-[#EEF3F8] dark:bg-[#18181B]" />
            <div className="w-24 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
          </div>
          <div className="w-12 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
        </div>
        <div className="space-y-1.5 pt-1">
          <div className="w-3/4 h-3.5 rounded bg-[#E2E8F0] dark:bg-[#27272A]" />
          <div className="w-full h-3 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden p-6 rounded-2xl bg-white dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] shadow-xs space-y-4">
      <Shimmer />
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded-full bg-[#EEF3F8] dark:bg-[#18181B]" />
          <div className="w-28 h-4 rounded-md bg-[#EEF3F8] dark:bg-[#18181B]" />
          <div className="w-16 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
        </div>
        <div className="w-16 h-5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B]" />
      </div>

      {/* Main Quote / Content */}
      <div className="space-y-2 border-l-2 border-[#D9E1EC] dark:border-[#27272A] pl-3 py-1">
        <div className="w-4/5 h-4 rounded bg-[#E2E8F0] dark:bg-[#27272A]" />
        <div className="w-full h-3.5 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
        <div className="w-2/3 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
      </div>

      {/* Footer Tags & Actions */}
      <div className="pt-3 border-t border-[#EEF3F8] dark:border-[#1C1C20] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-14 h-5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B]" />
          <div className="w-16 h-5 rounded-full bg-[#EEF3F8] dark:bg-[#18181B]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-6 rounded-lg bg-[#EEF3F8] dark:bg-[#18181B]" />
          <div className="w-14 h-6 rounded-lg bg-[#EEF3F8] dark:bg-[#18181B]" />
        </div>
      </div>
    </div>
  );
};

export const TimelineSkeleton: React.FC<{ count?: number; mode?: 'clean' | 'detailed' }> = ({ count = 4, mode = 'detailed' }) => {
  return (
    <div className="space-y-3.5 max-w-4xl mx-auto w-full">
      {Array.from({ length: count }).map((_, i) => (
        <AtomCardSkeleton key={i} mode={mode} />
      ))}
    </div>
  );
};

export const CanvasNodeSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden p-4 rounded-2xl bg-[#FAFBFD] dark:bg-[#121214] border border-[#D9E1EC] dark:border-[#27272A] shadow-xl space-y-3"
        >
          <Shimmer />
          <div className="flex items-center justify-between">
            <div className="w-20 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
            <div className="w-12 h-4 rounded-full bg-[#EEF3F8] dark:bg-[#18181B]" />
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-3.5 rounded bg-[#E2E8F0] dark:bg-[#27272A]" />
            <div className="w-5/6 h-3 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
            <div className="w-2/3 h-3 rounded bg-[#EEF3F8] dark:bg-[#18181B]" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AISynthesisSkeleton: React.FC = () => {
  return (
    <div className="relative overflow-hidden p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-[#D9E1EC] dark:border-[#27272A] shadow-sm space-y-3">
      <Shimmer />
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#325FEC] dark:bg-[#518FFF] animate-ping" />
        <div className="w-40 h-4 rounded bg-[#EEF3F8] dark:bg-[#27272A]" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="w-full h-3.5 rounded bg-[#EEF3F8] dark:bg-[#27272A]" />
        <div className="w-11/12 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#27272A]" />
        <div className="w-4/5 h-3.5 rounded bg-[#EEF3F8] dark:bg-[#27272A]" />
      </div>
    </div>
  );
};
