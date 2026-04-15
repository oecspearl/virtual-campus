"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { exportToCSV, exportToExcel, exportToPDF, ReportConfig, ReportData } from '@/lib/reports/report-engine';

interface ReportBuilderProps {
  onReportGenerated?: (data: ReportData) => void;
}

export default function ReportBuilder({ onReportGenerated }: ReportBuilderProps) {
  const [config, setConfig] = useState<ReportConfig>({
    data_sources: [],
    fields: [],
    filters: [],
    visualization: { type: 'table' },
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const availableDataSources = [
    { value: 'enrollments', label: 'Enrollments' },
    { value: 'assignments', label: 'Assignments' },
    { value: 'assignment_submissions', label: 'Assignment Submissions' },
    { value: 'quizzes', label: 'Quizzes' },
    { value: 'quiz_attempts', label: 'Quiz Attempts' },
    { value: 'grades', label: 'Grades' },
    { value: 'lesson_progress', label: 'Lesson Progress' },
    { value: 'users', label: 'Users' },
  ];

  const handleGenerate = async () => {
    if (!config.data_sources.length || !config.fields.length) {
      alert('Please select at least one data source and field');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      const result = await response.json();

      if (response.ok) {
        setReportData(result.data);
        if (onReportGenerated) {
          onReportGenerated(result.data);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!reportData) return;

    const filename = `report-${new Date().toISOString().split('T')[0]}`;

    try {
      if (format === 'csv') {
        exportToCSV(reportData, filename);
      } else if (format === 'excel') {
        exportToExcel(reportData, filename);
      } else if (format === 'pdf') {
        await exportToPDF(reportData, filename);
      }
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      alert(`Failed to export to ${format}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Report Builder</h2>
        <p className="text-gray-600">Create custom reports from your data</p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200 space-y-6">
        {/* Data Sources */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Sources
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availableDataSources.map((source) => (
              <label key={source.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.data_sources.includes(source.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setConfig({
                        ...config,
                        data_sources: [...config.data_sources, source.value],
                      });
                    } else {
                      setConfig({
                        ...config,
                        data_sources: config.data_sources.filter((s) => s !== source.value),
                      });
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{source.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fields to Include
          </label>
          <input
            type="text"
            placeholder="Enter field names separated by commas (e.g., id, name, email)"
            className="w-full px-4 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={config.fields.join(', ')}
            onChange={(e) => {
              const fields = e.target.value
                .split(',')
                .map((f) => f.trim())
                .filter(Boolean);
              setConfig({ ...config, fields });
            }}
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full px-4 py-2 bg-slate-800 text-white font-medium rounded-lg  transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <Icon icon="material-symbols:description" className="w-5 h-5" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white rounded-lg p-6 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Icon icon="material-symbols:download" className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Icon icon="material-symbols:download" className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Icon icon="material-symbols:download" className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {reportData.columns.map((col, idx) => (
                    <th
                      key={idx}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.rows.slice(0, 100).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {String(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {reportData.summary && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Total Rows: {reportData.summary.total_rows}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


