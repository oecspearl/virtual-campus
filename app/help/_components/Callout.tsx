import React from 'react';
import { Icon } from '@iconify/react';

export type CalloutVariant = 'info' | 'success' | 'warning' | 'danger' | 'tip' | 'feature';

interface CalloutProps {
  variant?: CalloutVariant;
  icon?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<CalloutVariant, { bg: string; border: string; title: string; body: string; iconColor: string; icon: string }> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-900',
    body: 'text-blue-800',
    iconColor: 'text-blue-600',
    icon: 'mdi:information-outline',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    title: 'text-emerald-900',
    body: 'text-emerald-800',
    iconColor: 'text-emerald-600',
    icon: 'mdi:check-circle-outline',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'text-amber-900',
    body: 'text-amber-800',
    iconColor: 'text-amber-600',
    icon: 'mdi:alert-outline',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    title: 'text-red-900',
    body: 'text-red-800',
    iconColor: 'text-red-600',
    icon: 'mdi:alert-octagon-outline',
  },
  tip: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    title: 'text-indigo-900',
    body: 'text-indigo-800',
    iconColor: 'text-indigo-600',
    icon: 'mdi:lightbulb-on-outline',
  },
  feature: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    title: 'text-violet-900',
    body: 'text-violet-800',
    iconColor: 'text-violet-600',
    icon: 'mdi:sparkles',
  },
};

export default function Callout({ variant = 'info', icon, title, children, className = '' }: CalloutProps) {
  const v = variants[variant];
  return (
    <div
      role="note"
      className={`flex gap-3 rounded-xl border ${v.border} ${v.bg} p-4 ${className}`}
    >
      <Icon icon={icon ?? v.icon} className={`w-5 h-5 flex-shrink-0 mt-0.5 ${v.iconColor}`} aria-hidden />
      <div className={`text-sm leading-relaxed ${v.body} min-w-0`}>
        {title && <p className={`font-semibold mb-1 ${v.title}`}>{title}</p>}
        <div className="space-y-2 [&_strong]:font-semibold [&_strong]:text-current [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
