'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Award, Target, ChevronRight } from 'lucide-react';

interface Competency {
  id: string;
  name: string;
  description?: string;
  category?: string;
  level: number;
  current_level: number;
  evidence?: Array<{
    type: string;
    description: string;
    added_at: string;
  }>;
  last_updated?: string;
}

interface CompetencyStats {
  total_competencies: number;
  acquired_competencies: number;
  mastered_competencies: number;
  average_level: number;
}

interface CompetencyData {
  stats: CompetencyStats;
  competencies: Competency[];
  by_category: Record<string, Competency[]>;
}

interface CompetencyRadarProps {
  studentId?: string;
  showDetails?: boolean;
  maxCategories?: number;
}

export default function CompetencyRadar({
  studentId,
  showDetails = true,
  maxCategories = 8,
}: CompetencyRadarProps) {
  const [data, setData] = useState<CompetencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCompetencies() {
      try {
        const url = studentId
          ? `/api/competencies/student?student_id=${studentId}`
          : '/api/competencies/student';
        const response = await fetch(url);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch competencies');
        }

        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchCompetencies();
  }, [studentId]);

  // Calculate radar chart data
  const radarData = useMemo(() => {
    if (!data?.by_category) return [];

    return Object.entries(data.by_category)
      .slice(0, maxCategories)
      .map(([category, competencies]) => {
        const avgLevel =
          competencies.reduce((sum, c) => sum + c.current_level, 0) /
          competencies.length;
        return {
          category,
          level: avgLevel,
          competencyCount: competencies.length,
        };
      });
  }, [data, maxCategories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Total Skills"
          value={data.stats.total_competencies}
          color="blue"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Acquired"
          value={data.stats.acquired_competencies}
          color="green"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          label="Mastered"
          value={data.stats.mastered_competencies}
          color="purple"
        />
        <StatCard
          icon={<div className="text-xs font-bold">AVG</div>}
          label="Avg Level"
          value={`${Math.round(data.stats.average_level * 100)}%`}
          color="amber"
        />
      </div>

      {/* Radar chart visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Skill Distribution
        </h3>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* SVG Radar */}
          <div className="flex-1 flex items-center justify-center">
            <RadarChart data={radarData} size={280} />
          </div>

          {/* Category legend */}
          <div className="lg:w-64 space-y-2">
            {radarData.map((item, index) => (
              <button
                key={item.category}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === item.category ? null : item.category
                  )
                }
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  selectedCategory === item.category
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getColor(index) }}
                />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.category}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {Math.round(item.level * 100)}% • {item.competencyCount} skills
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    selectedCategory === item.category ? 'rotate-90' : ''
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed competencies list */}
      {showDetails && selectedCategory && data.by_category[selectedCategory] && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {selectedCategory} Skills
          </h3>

          <div className="space-y-3">
            {data.by_category[selectedCategory].map((competency) => (
              <CompetencyItem key={competency.id} competency={competency} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function RadarChart({
  data,
  size,
}: {
  data: Array<{ category: string; level: number }>;
  size: number;
}) {
  if (data.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center">
        No competency data available
      </div>
    );
  }

  const center = size / 2;
  const radius = size * 0.4;
  const angleStep = (2 * Math.PI) / data.length;

  // Calculate points for each data item
  const dataPoints = data.map((item, index) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = radius * item.level;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  });

  // Create polygon path
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Create grid circles
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid circles */}
      {gridLevels.map((level) => (
        <circle
          key={level}
          cx={center}
          cy={center}
          r={radius * level}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-200 dark:text-gray-700"
        />
      ))}

      {/* Grid lines */}
      {data.map((_, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        return (
          <line
            key={index}
            x1={center}
            y1={center}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-200 dark:text-gray-700"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={polygonPath}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="rgb(59, 130, 246)"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="5"
          fill={getColor(index)}
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {/* Labels */}
      {data.map((item, index) => {
        const angle = index * angleStep - Math.PI / 2;
        const labelRadius = radius + 25;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);

        return (
          <text
            key={index}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
            style={{ fontSize: '10px' }}
          >
            {item.category.length > 12
              ? item.category.substring(0, 10) + '...'
              : item.category}
          </text>
        );
      })}
    </svg>
  );
}

function CompetencyItem({ competency }: { competency: Competency }) {
  const levelPercent = Math.round(competency.current_level * 100);
  const levelLabel =
    levelPercent >= 80
      ? 'Mastered'
      : levelPercent >= 50
      ? 'Proficient'
      : levelPercent > 0
      ? 'Developing'
      : 'Not Started';

  const levelColor =
    levelPercent >= 80
      ? 'text-green-600 dark:text-green-400'
      : levelPercent >= 50
      ? 'text-blue-600 dark:text-blue-400'
      : levelPercent > 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-gray-400 dark:text-gray-500';

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {competency.name}
          </h4>
          {competency.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {competency.description}
            </p>
          )}
        </div>
        <span className={`text-sm font-medium ${levelColor}`}>{levelLabel}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              levelPercent >= 80
                ? 'bg-green-500'
                : levelPercent >= 50
                ? 'bg-blue-500'
                : levelPercent > 0
                ? 'bg-amber-500'
                : 'bg-gray-300'
            }`}
            style={{ width: `${levelPercent}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 w-12 text-right">
          {levelPercent}%
        </span>
      </div>
    </div>
  );
}

function getColor(index: number): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#8B5CF6', // violet
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];
  return colors[index % colors.length];
}
