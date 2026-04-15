import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label?: string;
}

export function Input({ className = '', label, id, ...props }: InputProps) {
  if (label) {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          id={id}
          className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green focus:border-oecs-lime-green transition-colors w-full ${className}`}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      id={id}
      className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-oecs-lime-green focus:border-oecs-lime-green transition-colors ${className}`}
      {...props}
    />
  );
}
