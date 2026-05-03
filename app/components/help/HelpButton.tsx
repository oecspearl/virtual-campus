'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import HelpSystem from './HelpSystem';

interface HelpButtonProps {
  userRole?: string;
  className?: string;
  position?: 'fixed' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

export default function HelpButton({ 
  userRole = 'student', 
  className = '', 
  position = 'fixed',
  size = 'md'
}: HelpButtonProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const positionClasses = position === 'fixed'
    ? 'fixed right-4 sm:right-6 z-[55]'
    : 'inline-block';

  const fixedStyle = position === 'fixed'
    ? { bottom: 'calc(env(safe-area-inset-bottom, 0px) + var(--help-bottom-offset, 88px))' }
    : undefined;

  return (
    <>
      <button
        onClick={() => setIsHelpOpen(true)}
        className={`
          ${positionClasses}
          ${sizeClasses[size]}
          bg-blue-600 hover:bg-blue-700
          text-white rounded-full shadow-lg
          hover:shadow-xl transition-all duration-200
          flex items-center justify-center
          group
          ${className}
        `}
        style={fixedStyle}
        title="Open Help Center"
        aria-label="Open Help Center"
      >
        <Icon icon="mdi:help-circle" className={`${iconSizes[size]} group-hover:scale-110 transition-transform`} />
      </button>

      <HelpSystem 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)}
        userRole={userRole}
      />
    </>
  );
}
