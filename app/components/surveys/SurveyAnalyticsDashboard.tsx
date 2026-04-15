"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/ui/Button";

interface SurveyAnalyticsDashboardProps {
  surveyId: string;
}

export default function SurveyAnalyticsDashboard({
  surveyId
}: SurveyAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    loadAnalytics();
  }, [surveyId]);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/analytics`);
      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    setExporting(true);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/analytics/export?format=${format}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-${surveyId}-export.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `survey-${surveyId}-export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Icon icon="material-symbols:progress-activity" className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <Icon icon="material-symbols:error" className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
        <Button variant="secondary" onClick={loadAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!analytics) return null;

  const { survey, summary, question_stats } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-gray-900">{survey.title}</h1>
          <p className="text-sm text-gray-500">
            {survey.survey_type.replace(/_/g, ' ')} • Created {new Date(survey.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => handleExport('csv')} disabled={exporting}>
            <Icon icon="material-symbols:download" className="w-4 h-4 mr-1" />
            <span>Export CSV</span>
          </Button>
          <Button variant="secondary" onClick={() => handleExport('json')} disabled={exporting}>
            <Icon icon="material-symbols:code" className="w-4 h-4 mr-1" />
            <span>Export JSON</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Responses"
          value={summary.total_responses}
          icon="material-symbols:groups"
          color="blue"
        />
        <SummaryCard
          title="In Progress"
          value={summary.in_progress}
          icon="material-symbols:pending"
          color="yellow"
        />
        <SummaryCard
          title="Completion Rate"
          value={`${summary.completion_rate}%`}
          icon="material-symbols:check-circle"
          color="green"
        />
        <SummaryCard
          title="Avg. Time"
          value={formatTime(summary.avg_completion_time)}
          icon="material-symbols:timer"
          color="purple"
        />
      </div>

      {/* No responses message */}
      {summary.total_responses === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Icon icon="material-symbols:inbox" className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No responses yet</p>
          <p className="text-sm text-gray-400">Share the survey to start collecting feedback</p>
        </div>
      ) : (
        /* Question Statistics */
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">Question Results</h2>

          {Object.entries(question_stats).map(([questionId, stats]: [string, any]) => (
            <QuestionStats key={questionId} stats={stats} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon icon={icon} className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function QuestionStats({ stats }: { stats: any }) {
  const { question_text, type, response_count, distribution, average, nps_score, text_responses } = stats;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded mb-2 inline-block">
            {type.replace(/_/g, ' ')}
          </span>
          <h3 className="text-sm font-medium text-gray-900">{question_text}</h3>
        </div>
        <span className="text-xs text-gray-500">{response_count} responses</span>
      </div>

      {response_count === 0 ? (
        <p className="text-sm text-gray-400">No responses for this question</p>
      ) : (
        <>
          {/* NPS Display */}
          {type === 'nps' && nps_score !== null && (
            <div className="mb-4">
              <NPSGauge score={nps_score} stats={stats} />
            </div>
          )}

          {/* Average for numeric types */}
          {(type === 'likert_scale' || type === 'rating_scale' || type === 'slider') && average !== null && (
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">
                {average.toFixed(1)}
                <span className="text-sm font-normal text-gray-500 ml-1">avg</span>
              </p>
            </div>
          )}

          {/* Distribution chart for choice-based questions */}
          {(type === 'likert_scale' || type === 'rating_scale' || type === 'multiple_choice' || type === 'nps') &&
            Object.keys(distribution).length > 0 && (
              <DistributionChart distribution={distribution} total={response_count} type={type} />
            )}

          {/* Text responses */}
          {(type === 'text' || type === 'essay') && text_responses && text_responses.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Recent Responses:</p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {text_responses.slice(0, 10).map((text: string, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-sm text-gray-700">
                    {text}
                  </div>
                ))}
              </div>
              {stats.total_text_responses > 10 && (
                <p className="text-xs text-gray-500">
                  +{stats.total_text_responses - 10} more responses
                </p>
              )}
            </div>
          )}

          {/* Ranking results */}
          {type === 'ranking' && Object.keys(distribution).length > 0 && (
            <div className="space-y-2">
              {Object.entries(distribution)
                .sort((a: any, b: any) => a[1].average_position - b[1].average_position)
                .map(([item, data]: [string, any], idx) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-900">{item}</span>
                    <span className="text-xs text-gray-500">
                      (avg position: {data.average_position.toFixed(1)})
                    </span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DistributionChart({
  distribution,
  total,
  type
}: {
  distribution: Record<string, number>;
  total: number;
  type: string;
}) {
  const entries = Object.entries(distribution).sort((a, b) => {
    // Sort numerically if keys are numbers
    const aNum = parseInt(a[0]);
    const bNum = parseInt(b[0]);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return 0;
  });

  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-2">
      {entries.map(([label, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

        // Color based on NPS category
        let barColor = 'bg-blue-500';
        if (type === 'nps') {
          const score = parseInt(label);
          if (score >= 9) barColor = 'bg-green-500';
          else if (score >= 7) barColor = 'bg-yellow-500';
          else barColor = 'bg-red-500';
        }

        return (
          <div key={label} className="flex items-center gap-3">
            <span className="w-8 text-xs text-gray-600 text-right">{label}</span>
            <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-300`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="w-16 text-xs text-gray-500 text-right">
              {count} ({percentage.toFixed(0)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NPSGauge({ score, stats }: { score: number; stats: any }) {
  // NPS ranges from -100 to 100
  const normalizedScore = ((score + 100) / 200) * 100;

  let category = 'Needs Improvement';
  let categoryColor = 'text-red-600';
  if (score >= 70) {
    category = 'Excellent';
    categoryColor = 'text-green-600';
  } else if (score >= 50) {
    category = 'Great';
    categoryColor = 'text-green-500';
  } else if (score >= 0) {
    category = 'Good';
    categoryColor = 'text-yellow-600';
  }

  return (
    <div className="text-center">
      <div className="relative inline-block">
        <div className="text-5xl font-bold text-gray-900">{score}</div>
        <p className={`text-sm font-medium ${categoryColor}`}>{category}</p>
      </div>

      <div className="flex justify-center gap-6 mt-4 text-sm">
        <div>
          <p className="text-2xl font-semibold text-green-600">{stats.promoters_count || 0}</p>
          <p className="text-xs text-gray-500">Promoters (9-10)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-yellow-600">{stats.passives_count || 0}</p>
          <p className="text-xs text-gray-500">Passives (7-8)</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-red-600">{stats.detractors_count || 0}</p>
          <p className="text-xs text-gray-500">Detractors (0-6)</p>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number | null): string {
  if (!seconds) return '-';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
