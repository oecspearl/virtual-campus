'use client';

import React from 'react';

export interface ToggleSwitchProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * Controlled on/off toggle with an attached label and descriptor.
 * The parent owns the `enabled` state; every click flips it via
 * `onChange(!enabled)`.
 */
export default function ToggleSwitch({
  label,
  description,
  enabled,
  onChange,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
