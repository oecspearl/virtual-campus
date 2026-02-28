'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ComparisonChartProps {
  data1: any[];
  data2: any[];
  dataKey: string;
  xAxisKey?: string;
  name1: string;
  name2: string;
  color1?: string;
  color2?: string;
  height?: number;
}

export default function ComparisonChart({
  data1,
  data2,
  dataKey,
  xAxisKey = 'date',
  name1,
  name2,
  color1 = '#3b82f6',
  color2 = '#ef4444',
  height = 300,
}: ComparisonChartProps) {
  // Validate height prop - ensure it's a valid number
  const safeHeight = typeof height === 'number' && !isNaN(height) && isFinite(height) && height > 0
    ? Math.max(100, Math.min(2000, height)) // Clamp between 100 and 2000
    : 300;

  // Validate and merge data for comparison
  const safeData1 = (data1 || []).filter((item: any) => item && typeof item === 'object');
  const safeData2 = (data2 || []).filter((item: any) => item && typeof item === 'object');
  
  const mergedData = safeData1.map((item1: any) => {
    const item2 = safeData2.find((i: any) => i && i[xAxisKey] === item1[xAxisKey]);
    const currentValue = item1[dataKey];
    const previousValue = item2?.[dataKey];
    
    // Ensure values are valid numbers - convert strings to numbers if needed
    const currentNum = typeof currentValue === 'number' ? currentValue : typeof currentValue === 'string' ? parseFloat(currentValue) : 0;
    const previousNum = typeof previousValue === 'number' ? previousValue : typeof previousValue === 'string' ? parseFloat(previousValue) : 0;
    
    const current = (!isNaN(currentNum) && isFinite(currentNum)) ? currentNum : 0;
    const previous = (!isNaN(previousNum) && isFinite(previousNum)) ? previousNum : 0;
    
    return {
      ...item1,
      [`${dataKey}_current`]: Math.max(0, current),
      [`${dataKey}_previous`]: Math.max(0, previous),
    };
  }).filter((item: any) => item && typeof item === 'object'); // Remove any invalid items

  if (mergedData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${safeHeight}px` }}>
        <span className="text-gray-500">No valid data to display</span>
      </div>
    );
  }

  // Calculate domain to prevent NaN
  const getNumericDomain = (): [number, number] => {
    const allValues: number[] = [];
    mergedData.forEach((item: any) => {
      const current = item[`${dataKey}_current`];
      const previous = item[`${dataKey}_previous`];
      if (typeof current === 'number' && !isNaN(current) && isFinite(current)) {
        allValues.push(current);
      }
      if (typeof previous === 'number' && !isNaN(previous) && isFinite(previous)) {
        allValues.push(previous);
      }
    });
    
    if (allValues.length === 0) {
      return [0, 100];
    }
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Validate min and max are valid numbers
    if (isNaN(min) || !isFinite(min) || isNaN(max) || !isFinite(max)) {
      return [0, 100];
    }
    
    if (min === max) {
      const safeMin = Math.max(0, min - 10);
      const safeMax = max + 10;
      return [safeMin, safeMax];
    }
    
    const padding = (max - min) * 0.1 || 1;
    const domainMin = Math.max(0, min - padding);
    const domainMax = max + padding;
    
    // Final validation to ensure no NaN
    if (isNaN(domainMin) || !isFinite(domainMin) || isNaN(domainMax) || !isFinite(domainMax)) {
      return [0, 100];
    }
    
    return [domainMin, domainMax];
  };

  const numericDomain = getNumericDomain();

  return (
    <div style={{ width: '100%', height: `${safeHeight}px`, minHeight: '100px', minWidth: '200px', position: 'relative', display: 'block' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={mergedData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey={xAxisKey} 
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(value) => {
            if (typeof value === 'string' && value.includes('-')) {
              return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            return value;
          }}
        />
        <YAxis stroke="#6b7280" fontSize={12} domain={numericDomain} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px'
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line
          type="monotone"
          dataKey={`${dataKey}_current`}
          name={name1}
          stroke={color1}
          strokeWidth={2}
          dot={{ fill: color1, r: 3 }}
        />
        <Line
          type="monotone"
          dataKey={`${dataKey}_previous`}
          name={name2}
          stroke={color2}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: color2, r: 3 }}
        />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
