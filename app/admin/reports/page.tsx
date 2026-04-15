'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import Link from 'next/link';
import AccessibleModal from '@/app/components/ui/AccessibleModal';

interface CustomReport {
  id: string;
  name: string;
  description?: string;
  report_type: string;
  base_table?: string;
  columns: string[];
  filters: any[];
  chart_type?: string;
  is_shared: boolean;
  created_at: string;
  last_run_at?: string;
  run_count: number;
}

export default function CustomReportsPage() {
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CustomReport | null>(null);
  const [executing, setExecuting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/custom');
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeReport = async (reportId: string) => {
    try {
      setExecuting(true);
      const response = await fetch(`/api/reports/custom/${reportId}/execute`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.data || []);
        setSelectedReport(reports.find(r => r.id === reportId) || null);
        await loadReports();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to execute report');
      }
    } catch (error) {
      console.error('Failed to execute report:', error);
      alert('Failed to execute report');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-normal text-slate-900 tracking-tight">Custom Reports</h1>
            <p className="mt-2 text-sm text-gray-600">
              Create and execute custom reports with flexible filtering and visualization
            </p>
          </div>
          <Link href="/admin/reports/builder">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
              Create Report
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Icon icon="material-symbols:assessment" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
          <p className="text-gray-600 mb-6">Create your first custom report to get started.</p>
          <Link href="/admin/reports/builder">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-2" />
              Create Report
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                  {report.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{report.description}</p>
                  )}
                </div>
                {report.is_shared && (
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    Shared
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <Icon icon="material-symbols:table-chart" className="w-4 h-4 mr-2" />
                  <span>{report.report_type}</span>
                </div>
                {report.base_table && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Icon icon="material-symbols:storage" className="w-4 h-4 mr-2" />
                    <span>{report.base_table}</span>
                  </div>
                )}
                {report.last_run_at && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Icon icon="material-symbols:schedule" className="w-4 h-4 mr-2" />
                    <span>Last run: {new Date(report.last_run_at).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Icon icon="material-symbols:play-arrow" className="w-4 h-4 mr-2" />
                  <span>Run {report.run_count} times</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => executeReport(report.id)}
                  disabled={executing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {executing ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Running...
                    </>
                  ) : (
                    <>
                      <Icon icon="material-symbols:play-arrow" className="w-4 h-4 mr-2" />
                      Run Report
                    </>
                  )}
                </Button>
                <Link href={`/admin/reports/${report.id}`}>
                  <Button variant="outline">
                    <Icon icon="material-symbols:edit" className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Modal */}
      <AccessibleModal
        isOpen={!!(selectedReport && results.length > 0)}
        onClose={() => {
          setSelectedReport(null);
          setResults([]);
        }}
        title={selectedReport?.name || 'Report Results'}
        size="full"
      >
            <div className="max-h-[70vh] overflow-auto">
              <div className="mb-4 text-sm text-gray-600">
                {results.length} results
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {selectedReport?.columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((row, idx) => (
                      <tr key={idx}>
                        {selectedReport?.columns.map((col) => (
                          <td
                            key={col}
                            className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                          >
                            {typeof row[col] === 'object'
                              ? JSON.stringify(row[col])
                              : String(row[col] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReport(null);
                  setResults([]);
                }}
              >
                Close
              </Button>
            </div>
      </AccessibleModal>
    </div>
  );
}

