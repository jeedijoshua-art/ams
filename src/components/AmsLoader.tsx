'use client';

import React from 'react';

interface AmsLoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  className?: string;
}

export function AmsLoader({
  label = 'Preparing your workspace…',
  size = 'md',
  fullScreen = false,
  className = '',
}: AmsLoaderProps) {
  const sizeMap = {
    sm: {
      ring: 'w-6 h-6 border-2',
      text: 'text-xs',
      gap: 'gap-2',
    },
    md: {
      ring: 'w-10 h-10 border-[2.5px]',
      text: 'text-xs',
      gap: 'gap-3',
    },
    lg: {
      ring: 'w-14 h-14 border-3',
      text: 'text-sm',
      gap: 'gap-4',
    },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex flex-col items-center justify-center ${currentSize.gap} ${className}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Outer static boundary track */}
        <div
          className={`${currentSize.ring} rounded-full border-[#303831]`}
        />
        {/* Animated active attendance-ring segment */}
        <div
          className={`absolute inset-0 ${currentSize.ring} rounded-full border-[#C6F36B] border-t-transparent border-r-transparent animate-spin motion-reduce:animate-none motion-reduce:border-r-[#C6F36B]`}
          style={{ animationDuration: '0.85s' }}
        />
        {/* Inner geometric core dot */}
        <div className="w-1.5 h-1.5 rounded-full bg-[#C6F36B]/80" />
      </div>

      {label && (
        <span
          className={`font-mono ${currentSize.text} tracking-wide text-[#A0A89F] font-medium text-center select-none`}
        >
          {label}
        </span>
      )}
      <span className="sr-only">Loading AMS content…</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-[#101211] flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}
