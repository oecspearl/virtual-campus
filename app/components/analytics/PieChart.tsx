'use client';

import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export default function PieChart({
  data,
  dataKey,
  nameKey,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  // Validate height prop - ensure it's a valid number
  const safeHeight = typeof height === 'number' && !isNaN(height) && isFinite(height) && height > 0
    ? Math.max(100, Math.min(2000, height)) // Clamp between 100 and 2000
    : 300;

  // Validate and filter data to prevent NaN errors
  const validData = (data || []).filter((item: any) => {
    if (!item || typeof item !== 'object') return false;
    const value = item[dataKey];
    // Convert to number and validate
    const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
    return !isNaN(numValue) && isFinite(numValue) && numValue >= 0;
  }).map((item: any) => {
    const value = item[dataKey];
    const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
    return {
      ...item,
      [dataKey]: Math.max(0, isNaN(numValue) || !isFinite(numValue) ? 0 : numValue),
    };
  });

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${safeHeight}px` }}>
        <span className="text-gray-500">No valid data to display</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${safeHeight}px`, minHeight: '100px', minWidth: '200px', position: 'relative', display: 'block' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
        <Pie
          data={validData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey={dataKey}
          nameKey={nameKey}
        >
          {validData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px'
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
