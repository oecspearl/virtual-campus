'use client';

import { ReactNode } from 'react';
import MetricTrend from './MetricTrend';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label: string;
    positive: boolean;
  };
  trend?: {
    current: number;
    previous: number;
    label: string;
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  green: {
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-200',
  },
  orange: {
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  purple: {
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-200',
  },
  red: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    border: 'border-red-200',
  },
};

export default function MetricCard({ title, value, change, trend, icon, color = 'blue' }: MetricCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`bg-white rounded-lg border ${colors.border} shadow-sm p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className={`${colors.bg} ${colors.text} rounded-lg p-2`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change && (
          <span
            className={`text-sm font-medium ${
              change.positive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change.positive ? '+' : ''}
            {change.value}% {change.label}
          </span>
        )}
      </div>
      {trend && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <MetricTrend
            current={trend.current}
            previous={trend.previous}
            label={trend.label}
          />
        </div>
      )}
    </div>
  );
}
