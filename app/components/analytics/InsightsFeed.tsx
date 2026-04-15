"use client";

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface Insight {
  id: string;
  insight_type: string;
  entity_type: string;
  entity_id: string;
  insight: string;
  confidence: number;
  metadata: any;
  is_actionable: boolean;
  is_read: boolean;
  created_at: string;
}

interface InsightsFeedProps {
  entityType?: 'student' | 'course';
  entityId?: string;
}

export default function InsightsFeed({ entityType, entityId }: InsightsFeedProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [entityType, entityId]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (entityType) params.append('entity_type', entityType);
      if (entityId) params.append('entity_id', entityId);
      params.append('limit', '20');

      const response = await fetch(`/api/ai/insights?${params.toString()}`);
      const result = await response.json();

      if (response.ok) {
        setInsights(result.data || []);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'risk_alert':
        return 'material-symbols:warning';
      case 'engagement':
        return 'material-symbols:trending-up';
      case 'performance_trend':
        return 'material-symbols:analytics';
      case 'completion_prediction':
        return 'material-symbols:target';
      case 'grade_prediction':
        return 'material-symbols:school';
      default:
        return 'material-symbols:lightbulb';
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'risk_alert':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'engagement':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'performance_trend':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'completion_prediction':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'grade_prediction':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        <button
          onClick={loadInsights}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Icon icon="material-symbols:refresh" className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {insights.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Icon icon="material-symbols:lightbulb-outline" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No insights available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`border-2 rounded-lg p-4 ${getInsightColor(insight.insight_type)} ${
                !insight.is_read ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <Icon
                  icon={getInsightIcon(insight.insight_type)}
                  className="w-6 h-6 flex-shrink-0 mt-1"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">{insight.insight}</p>
                  <div className="flex items-center gap-4 text-xs opacity-70 mt-2">
                    <span>Confidence: {(insight.confidence * 100).toFixed(0)}%</span>
                    <span>{new Date(insight.created_at).toLocaleDateString()}</span>
                    {insight.is_actionable && (
                      <span className="px-2 py-1 bg-white/50 rounded-full">Actionable</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


