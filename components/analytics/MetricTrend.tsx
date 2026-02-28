'use client';

interface MetricTrendProps {
  current: number;
  previous: number;
  label: string;
  showPercentage?: boolean;
}

export default function MetricTrend({ current, previous, label, showPercentage = true }: MetricTrendProps) {
  const change = current - previous;
  const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;
  const isPositive = change >= 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{showPercentage ? `${changePercent}%` : change}
      </span>
    </div>
  );
}

