'use client';

import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  lines: Array<{
    key: string;
    name: string;
    color: string;
    strokeWidth?: number;
  }>;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
}

export default function LineChart({
  data,
  dataKey,
  xAxisKey = 'date',
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
}: LineChartProps) {
  // Validate height prop - ensure it's a valid number
  const safeHeight = typeof height === 'number' && !isNaN(height) && isFinite(height) && height > 0
    ? Math.max(100, Math.min(2000, height)) // Clamp between 100 and 2000
    : 300;

  // Validate and filter data to prevent NaN errors
  const validData = (data || []).map((item: any) => {
    if (!item || typeof item !== 'object') return null;
    
    const cleaned: any = { ...item };
    lines.forEach((line) => {
      const value = item[line.key];
      // Convert to number and validate
      const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
      cleaned[line.key] = (typeof numValue === 'number' && !isNaN(numValue) && isFinite(numValue)) 
        ? numValue 
        : 0;
    });
    // Preserve xAxisKey value
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

  // Calculate domain to prevent NaN
  const getNumericDomain = (): [number, number] => {
    const allValues: number[] = [];
    validData.forEach((item: any) => {
      lines.forEach((line) => {
        const val = item[line.key];
        if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
          allValues.push(val);
        }
      });
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
        <RechartsLineChart data={validData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
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
            labelFormatter={(label) => {
              if (typeof label === 'string' && label.includes('-')) {
                return new Date(label).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                });
              }
              return label;
            }}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={line.strokeWidth || 2}
              dot={{ fill: line.color, r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

