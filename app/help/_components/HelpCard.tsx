import React from 'react';
import { Icon } from '@iconify/react';

interface HelpCardProps {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  iconClassName?: string;
}

export default function HelpCard({ icon, title, description, children, iconClassName = '' }: HelpCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon icon={icon} className={`w-5 h-5 ${iconClassName}`} aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h4 className="font-semibold text-slate-900 leading-snug">{title}</h4>
          {description && <p className="text-sm text-slate-600 mt-1">{description}</p>}
        </div>
      </div>
      <div
        className={
          'text-sm text-slate-600 leading-relaxed ' +
          '[&_p]:leading-relaxed ' +
          '[&_ul]:space-y-1.5 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:marker:text-slate-400 ' +
          '[&_ol]:space-y-1.5 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:marker:text-slate-400 [&_ol]:marker:font-semibold ' +
          '[&_strong]:font-semibold [&_strong]:text-slate-800 ' +
          '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-slate-700 ' +
          '[&_a]:text-blue-600 [&_a]:underline-offset-2 hover:[&_a]:underline'
        }
      >
        {children}
      </div>
    </div>
  );
}
