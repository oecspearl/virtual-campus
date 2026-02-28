'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  bars: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  horizontal?: boolean;
}

export default function BarChart({
  data,
  bars,
  xAxisKey = 'name',
  height = 300,
  showGrid = true,
  showLegend = true,
  horizontal = false,
}: BarChartProps) {
  // Validate height prop - ensure it's a valid number
  const safeHeight = typeof height === 'number' && !isNaN(height) && isFinite(height) && height > 0
    ? Math.max(100, Math.min(2000, height)) // Clamp between 100 and 2000
    : 300;

  // Validate and filter data to prevent NaN errors
  const validData = (data || []).map((item: any) => {
    if (!item || typeof item !== 'object') return null;
    
    const cleaned: any = { ...item };
    bars.forEach((bar) => {
      const value = item[bar.key];
      // Convert to number and validate
      const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
      cleaned[bar.key] = (typeof numValue === 'number' && !isNaN(numValue) && isFinite(numValue)) 
        ? Math.max(0, numValue) // Ensure non-negative
        : 0;
    });
    // Preserve xAxisKey value even if it's not a number
    if (xAxisKey && item[xAxisKey] !== undefined) {
      cleaned[xAxisKey] = item[xAxisKey];
    }
    return cleaned;
  }).filter((item: any) => item !== null && item !== undefined); // Remove null/undefined

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${safeHeight}px` }}>
        <span className="text-gray-500">No valid data to display</span>
      </div>
    );
  }

  // Calculate domain to prevent NaN - ensure we have valid ranges
  const getNumericDomain = (): [number, number] => {
    const allValues: number[] = [];
    validData.forEach((item: any) => {
      bars.forEach((bar) => {
        const val = item[bar.key];
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          allValues.push(val);
        }
      });
    });
    
    if (allValues.length === 0) {
      return [0, 100]; // Default domain if no values
    }
    
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    // Validate min and max are valid numbers
    if (isNaN(min) || !isFinite(min) || isNaN(max) || !isFinite(max)) {
      return [0, 100];
    }
    
    // If all values are the same, add padding to prevent division by zero
    if (min === max) {
      const safeMin = Math.max(0, min - 10);
      const safeMax = max + 10;
      return [safeMin, safeMax];
    }
    
    // Add small padding
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
        <RechartsBarChart 
          data={validData} 
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: horizontal ? 5 : 0, bottom: horizontal ? 5 : 60 }}
        >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis 
          type={horizontal ? 'number' : 'category'}
          dataKey={horizontal ? undefined : xAxisKey}
          stroke="#6b7280"
          fontSize={12}
          angle={horizontal ? 0 : -45}
          textAnchor={horizontal ? 'end' : 'end'}
          height={horizontal ? undefined : 60}
          domain={horizontal ? numericDomain : undefined}
        />
        <YAxis 
          type={horizontal ? 'category' : 'number'}
          dataKey={horizontal ? xAxisKey : undefined}
          stroke="#6b7280"
          fontSize={12}
          domain={horizontal ? undefined : numericDomain}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px'
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        {bars.map((bar) => (
          <Bar
            key={bar.key}
            dataKey={bar.key}
            name={bar.name}
            fill={bar.color}
            radius={[4, 4, 0, 0]}
          />
        ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

