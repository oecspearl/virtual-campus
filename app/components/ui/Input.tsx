import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label?: string;
}

// 44px floor + 16px font-size suppresses iOS auto-zoom on focus.
const baseInputClasses =
  'w-full min-h-[44px] px-3 py-2 text-base border border-gray-300 rounded-md ' +
  'focus:outline-none focus:ring-2 focus:ring-oecs-lime-green focus:border-oecs-lime-green ' +
  'transition-colors';

export function Input({ className = '', label, id, ...props }: InputProps) {
  if (label) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input id={id} className={`${baseInputClasses} ${className}`} {...props} />
      </div>
    );
  }

  return <input id={id} className={`${baseInputClasses} ${className}`} {...props} />;
}
