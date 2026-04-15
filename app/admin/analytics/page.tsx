'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MetricCard from '@/components/analytics/MetricCard';
import LineChart from '@/components/analytics/LineChart';
import BarChart from '@/components/analytics/BarChart';
import PieChart from '@/components/analytics/PieChart';
import LoadingIndicator, { InlineLoader } from '@/app/components/ui/LoadingIndicator';

interface MetricData {
  data: any[];
  count: number;
  metric_type: string;
}

interface ViewStatus {
  name: string;
  latest_date: string | null;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Comparison mode (compare with previous period)
  const [compareMode, setCompareMode] = useState(false);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60); // seconds
  const [isStale, setIsStale] = useState(false);
  const [viewStatus, setViewStatus] = useState<ViewStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Metrics state
  const [dauData, setDauData] = useState<MetricData | null>(null);
  const [courseEngagement, setCourseEngagement] = useState<MetricData | null>(null);
  const [activityTypes, setActivityTypes] = useState<MetricData | null>(null);
  const [courseCompletion, setCourseCompletion] = useState<MetricData | null>(null);
  const [topCourses, setTopCourses] = useState<MetricData | null>(null);
  const [overview, setOverview] = useState<any>(null);

  // Feature flag check
  useEffect(() => {
    const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== 'false';
    
    if (!analyticsEnabled) {
      router.push('/dashboard');
      return;
    }
  }, [router]);

  // Fetch all metrics
  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Helper function to fetch and parse a metric
      const fetchMetric = async (type: string, params?: string) => {
        const url = `/api/analytics/metrics?type=${type}${params || ''}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}: ${res.statusText}` }));
          throw new Error(errorData.error || errorData.message || `Failed to fetch ${type}: ${res.statusText}`);
        }
        
        const data = await res.json();
        if (data.error) {
          throw new Error(data.error + (data.message ? `: ${data.message}` : ''));
        }
        return data;
      };

      // Fetch multiple metrics in parallel with better error handling
      const results = await Promise.allSettled([
        fetchMetric('dau', `&start_date=${dateRange.start}&end_date=${dateRange.end}`).catch(e => ({ error: `DAU: ${e.message}` })),
        fetchMetric('course_engagement', `&start_date=${dateRange.start}&end_date=${dateRange.end}`).catch(e => ({ error: `Engagement: ${e.message}` })),
        fetchMetric('activity_types', `&start_date=${dateRange.start}&end_date=${dateRange.end}`).catch(e => ({ error: `Activities: ${e.message}` })),
        fetchMetric('course_completion').catch(e => ({ error: `Completion: ${e.message}` })),
        fetchMetric('top_courses', `&start_date=${dateRange.start}&end_date=${dateRange.end}`).catch(e => ({ error: `Top Courses: ${e.message}` })),
        fetchMetric('dau', `&start_date=${dateRange.start}&end_date=${dateRange.end}`).catch(e => ({ error: `Overview: ${e.message}` })),
      ]);

      // Extract data or errors
      const dau = results[0].status === 'fulfilled' && !results[0].value.error ? results[0].value : null;
      const engagement = results[1].status === 'fulfilled' && !results[1].value.error ? results[1].value : null;
      const activity = results[2].status === 'fulfilled' && !results[2].value.error ? results[2].value : null;
      const completion = results[3].status === 'fulfilled' && !results[3].value.error ? results[3].value : null;
      const topCourses = results[4].status === 'fulfilled' && !results[4].value.error ? results[4].value : null;
      const overviewData = results[5].status === 'fulfilled' && !results[5].value.error ? results[5].value : null;

      // Collect any errors
      const errors: string[] = [];
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push(`Metric ${index}: ${result.reason.message || result.reason}`);
        } else if (result.value?.error) {
          errors.push(result.value.error);
        }
      });

      // If critical metrics fail, show error
      if (errors.length > 0 && !dau && !overviewData) {
        throw new Error(`Failed to load analytics: ${errors.join(', ')}`);
      }

      // Log non-critical errors but continue
      if (errors.length > 0) {
        console.warn('Some analytics metrics failed:', errors);
        // Show a warning but don't block the UI - set as temporary warning
        const warningMessage = `Some metrics unavailable: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`;
        setError(warningMessage);
        setTimeout(() => setError(null), 8000); // Clear warning after 8 seconds
      }

      // Set data (use empty data structure if null to prevent errors)
      setDauData(dau || { data: [], count: 0, metric_type: 'dau' });
      setCourseEngagement(engagement || { data: [], count: 0, metric_type: 'course_engagement' });
      setActivityTypes(activity || { data: [], count: 0, metric_type: 'activity_types' });
      setCourseCompletion(completion || { data: [], count: 0, metric_type: 'course_completion' });
      setTopCourses(topCourses || { data: [], count: 0, metric_type: 'top_courses' });

      // Calculate overview stats
      if (overviewData.data && overviewData.data.length > 0) {
        const totalUsers = overviewData.data.reduce((sum: number, day: any) => sum + (day.active_users || 0), 0);
        const avgDailyUsers = Math.round(totalUsers / overviewData.data.length);
        const peakDay = overviewData.data.reduce((max: any, day: any) => 
          (day.active_users || 0) > (max.active_users || 0) ? day : max
        , overviewData.data[0]);

        setOverview({
          totalActiveUsers: peakDay?.active_users || 0,
          avgDailyUsers,
          totalActivities: overviewData.data.reduce((sum: number, day: any) => sum + (day.total_activities || 0), 0),
          activeCourses: peakDay?.active_courses || 0,
        });
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Analytics fetch error:', err);
      setError(err.message || 'Failed to load analytics');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  // Check view status on load
  const checkViewStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/refresh');
      if (res.ok) {
        const data = await res.json();
        setViewStatus(data.views || []);
        setIsStale(data.is_stale);
      }
    } catch (err) {
      console.error('Failed to check view status:', err);
    }
  }, []);

  useEffect(() => {
    checkViewStatus();
  }, [checkViewStatus]);

  // Refresh materialized views
  const refreshViews = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/analytics/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        console.log('Views refreshed:', data);
        setLastRefreshed(new Date());
        setIsStale(false);
        // Refetch metrics after refresh
        await fetchMetrics();
        await checkViewStatus();
      } else {
        const errorData = await res.json();
        console.error('Failed to refresh views:', errorData);
        setError(`Failed to refresh views: ${errorData.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('Failed to refresh views:', err);
      setError(`Failed to refresh views: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }, [checkViewStatus]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchMetrics();
      }, refreshInterval * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator variant="blocks" text="Loading analytics..." />
          </div>
        </div>
      </div>
    );
  }

  if (error && !overview && loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics Unavailable</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <button
                onClick={fetchMetrics}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
              >
                Try Again
              </button>
              <Link 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate chart data
  const dauChartData = dauData?.data || [];
  const activityChartData = activityTypes?.data?.reduce((acc: any, item: any) => {
    const existing = acc.find((a: any) => a.date === item.date);
    if (existing) {
      existing[item.activity_type] = item.count;
    } else {
      acc.push({
        date: item.date,
        [item.activity_type]: item.count,
      });
    }
    return acc;
  }, []) || [];

  const topCoursesData = topCourses?.data?.slice(0, 10) || [];
  const completionPieData = courseCompletion?.data?.map((course: any) => {
    const rate = course.completion_rate;
    // Validate that rate is a valid number
    const validRate = (typeof rate === 'number' && !isNaN(rate) && isFinite(rate)) ? rate : 0;
    return {
      name: course.course_title || 'Unknown',
      value: Math.max(0, Math.min(100, validRate)), // Clamp between 0 and 100
    };
  }).filter((item: any) => item.value > 0) || []; // Only show courses with completion > 0

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-xl font-medium text-white flex items-center flex-wrap gap-2">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Analytics Dashboard</span>
                  </h1>
                  <p className="text-blue-100 mt-2 text-sm sm:text-base">Comprehensive learning analytics and insights</p>
                </div>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-center flex items-center justify-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Warning Banner */}
        {error && overview && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-yellow-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Stale Data Warning */}
        {isStale && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-orange-800">
                  <strong>Analytics data may be outdated.</strong> The underlying views need to be refreshed to show the latest activity data.
                </p>
              </div>
              <button
                onClick={refreshViews}
                disabled={refreshing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <InlineLoader className="mr-1" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Views
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Date Range Picker & Controls */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Row 1: Date Range */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
              <label className="text-sm font-medium text-gray-700 w-full sm:w-auto">Date Range:</label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 flex-1 sm:flex-none">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full sm:w-auto px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500 hidden sm:inline">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full sm:w-auto px-3 py-2.5 min-h-[44px] border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={fetchMetrics}
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>

            {/* Row 2: Auto-refresh & Compare */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 pt-3 border-t border-gray-100">
              {/* Auto-refresh toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Auto-refresh</span>
                </label>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                  >
                    <option value={30}>Every 30s</option>
                    <option value={60}>Every 1m</option>
                    <option value={300}>Every 5m</option>
                    <option value={600}>Every 10m</option>
                  </select>
                )}
              </div>

              {/* Compare mode */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Compare with previous period</span>
              </label>

              {/* Last refreshed indicator */}
              {lastRefreshed && (
                <span className="text-xs text-gray-500 ml-auto">
                  Views last refreshed: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}

              {/* Live indicator */}
              {autoRefresh && (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs text-green-600 font-medium">Live</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview Metrics */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Peak Active Users"
              value={overview.totalActiveUsers}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              }
              color="blue"
            />
            <MetricCard
              title="Average Daily Users"
              value={overview.avgDailyUsers}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              color="green"
            />
            <MetricCard
              title="Total Activities"
              value={overview.totalActivities.toLocaleString()}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              color="orange"
            />
            <MetricCard
              title="Active Courses"
              value={overview.activeCourses}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              color="purple"
            />
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Active Users Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Daily Active Users</h2>
              <button
                onClick={async () => {
                  const url = `/api/analytics/export?type=dau&start_date=${dateRange.start}&end_date=${dateRange.end}&format=csv`;
                  const res = await fetch(url);
                  const blob = await res.blob();
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = `dau_${dateRange.start}_to_${dateRange.end}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(downloadUrl);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                title="Export to CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
            {dauChartData.length > 0 ? (
              <LineChart
                data={dauChartData}
                dataKey="active_users"
                xAxisKey="date"
                lines={[
                  { key: 'active_users', name: 'Active Users', color: '#3b82f6' },
                  { key: 'total_activities', name: 'Total Activities', color: '#10b981' },
                ]}
                height={300}
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Activity Types Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Activity Types Breakdown</h2>
            {activityChartData.length > 0 ? (
              <PieChart
                data={activityTypes?.data?.reduce((acc: any, item: any) => {
                  const existing = acc.find((a: any) => a.name === item.activity_type);
                  if (existing) {
                    existing.value += item.count;
                  } else {
                    acc.push({ name: item.activity_type, value: item.count });
                  }
                  return acc;
                }, []) || []}
                dataKey="value"
                nameKey="name"
                height={300}
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Top Courses and Completion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Courses by Engagement */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Top Courses by Engagement</h2>
              <button
                onClick={async () => {
                  const url = `/api/analytics/export?type=top_courses&start_date=${dateRange.start}&end_date=${dateRange.end}&format=csv`;
                  const res = await fetch(url);
                  const blob = await res.blob();
                  const downloadUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = `top_courses_${dateRange.start}_to_${dateRange.end}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(downloadUrl);
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                title="Export to CSV"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>
            {topCoursesData.length > 0 ? (
              <BarChart
                data={topCoursesData}
                xAxisKey="course_title"
                bars={[
                  { key: 'total_interactions', name: 'Total Interactions', color: '#8b5cf6' },
                  { key: 'total_students', name: 'Active Students', color: '#10b981' },
                ]}
                height={400}
                horizontal={true}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>

          {/* Course Completion Rates */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Course Completion Rates</h2>
            {completionPieData.length > 0 ? (
              <PieChart
                data={completionPieData}
                dataKey="value"
                nameKey="name"
                height={400}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Loading indicator for refresh */}
        {loading && overview && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Refreshing data...
          </div>
        )}
      </div>
    </div>
  );
}
