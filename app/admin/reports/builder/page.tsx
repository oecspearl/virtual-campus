'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Button from '@/app/components/Button';
import { Input } from '@/app/components/Input';

const AVAILABLE_TABLES = [
  { value: 'users', label: 'Users' },
  { value: 'courses', label: 'Courses' },
  { value: 'enrollments', label: 'Enrollments' },
  { value: 'course_grades', label: 'Course Grades' },
  { value: 'assignments', label: 'Assignments' },
  { value: 'assignment_submissions', label: 'Assignment Submissions' },
  { value: 'quizzes', label: 'Quizzes' },
  { value: 'quiz_attempts', label: 'Quiz Attempts' },
];

const REPORT_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'course', label: 'Course' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'grade', label: 'Grade' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'custom', label: 'Custom' },
];

const CHART_TYPES = [
  { value: 'table', label: 'Table' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
  { value: 'area', label: 'Area Chart' },
];

export default function ReportBuilderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    report_type: 'custom',
    base_table: '',
    columns: [] as string[],
    filters: [] as any[],
    order_by: [] as any[],
    limit_count: '',
    chart_type: 'table',
    is_shared: false,
  });
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleTableChange = (table: string) => {
    setFormData({ ...formData, base_table: table, columns: [] });
    // In production, fetch actual columns from API
    // For now, use common column names
    const commonColumns: Record<string, string[]> = {
      users: ['id', 'email', 'name', 'role', 'created_at'],
      courses: ['id', 'title', 'description', 'created_at'],
      enrollments: ['id', 'student_id', 'course_id', 'enrolled_at', 'status'],
      course_grades: ['id', 'student_id', 'course_id', 'score', 'max_score', 'percentage'],
      assignments: ['id', 'title', 'course_id', 'due_date', 'points'],
      assignment_submissions: ['id', 'assignment_id', 'student_id', 'submitted_at', 'status', 'grade'],
      quizzes: ['id', 'title', 'course_id', 'points', 'created_at'],
      quiz_attempts: ['id', 'quiz_id', 'student_id', 'score', 'max_score', 'completed_at'],
    };
    setAvailableColumns(commonColumns[table] || []);
  };

  const toggleColumn = (column: string) => {
    if (formData.columns.includes(column)) {
      setFormData({
        ...formData,
        columns: formData.columns.filter(c => c !== column),
      });
    } else {
      setFormData({
        ...formData,
        columns: [...formData.columns, column],
      });
    }
  };

  const addFilter = () => {
    setFormData({
      ...formData,
      filters: [...formData.filters, { column: '', operator: 'eq', value: '' }],
    });
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const newFilters = [...formData.filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFormData({ ...formData, filters: newFilters });
  };

  const removeFilter = (index: number) => {
    setFormData({
      ...formData,
      filters: formData.filters.filter((_, i) => i !== index),
    });
  };

  const addOrderBy = () => {
    setFormData({
      ...formData,
      order_by: [...formData.order_by, { column: '', direction: 'asc' }],
    });
  };

  const updateOrderBy = (index: number, field: string, value: any) => {
    const newOrderBy = [...formData.order_by];
    newOrderBy[index] = { ...newOrderBy[index], [field]: value };
    setFormData({ ...formData, order_by: newOrderBy });
  };

  const removeOrderBy = (index: number) => {
    setFormData({
      ...formData,
      order_by: formData.order_by.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.base_table || formData.columns.length === 0) {
      alert('Please fill in name, base table, and select at least one column');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/reports/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          limit_count: formData.limit_count ? parseInt(formData.limit_count) : null,
        }),
      });

      if (response.ok) {
        router.push('/admin/reports');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create report');
      }
    } catch (error) {
      console.error('Failed to create report:', error);
      alert('Failed to create report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Custom Report</h1>
        <p className="mt-2 text-sm text-gray-600">
          Build a custom report by selecting data source, columns, and filters
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Report Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type *
                </label>
                <select
                  value={formData.report_type}
                  onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  {REPORT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chart Type
                </label>
                <select
                  value={formData.chart_type}
                  onChange={(e) => setFormData({ ...formData, chart_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {CHART_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Data Source</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Table *
            </label>
            <select
              value={formData.base_table}
              onChange={(e) => handleTableChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select a table</option>
              {AVAILABLE_TABLES.map(table => (
                <option key={table.value} value={table.value}>{table.label}</option>
              ))}
            </select>
          </div>
        </div>

        {formData.base_table && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Columns</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableColumns.map(column => (
                <label key={column} className="flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.columns.includes(column)}
                    onChange={() => toggleColumn(column)}
                    className="mr-2"
                  />
                  <span className="text-sm">{column}</span>
                </label>
              ))}
            </div>
            {formData.columns.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded">
                <p className="text-sm font-medium text-blue-900">Selected: {formData.columns.join(', ')}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            <Button type="button" variant="outline" className="text-sm px-3 py-1.5" onClick={addFilter}>
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
              Add Filter
            </Button>
          </div>
          {formData.filters.length === 0 ? (
            <p className="text-sm text-gray-500">No filters added</p>
          ) : (
            <div className="space-y-2">
              {formData.filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Column</label>
                    <Input
                      type="text"
                      value={filter.column}
                      onChange={(e) => updateFilter(index, 'column', e.target.value)}
                      placeholder="column_name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Operator</label>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="eq">Equals</option>
                      <option value="in">In</option>
                      <option value="gte">Greater or Equal</option>
                      <option value="lte">Less or Equal</option>
                      <option value="like">Contains</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Value</label>
                    <Input
                      type="text"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, 'value', e.target.value)}
                      placeholder="value"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(index)}
                  >
                    <Icon icon="material-symbols:delete" className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Sorting</h2>
            <Button type="button" variant="outline" className="text-sm px-3 py-1.5" onClick={addOrderBy}>
              <Icon icon="material-symbols:add" className="w-4 h-4 mr-1" />
              Add Sort
            </Button>
          </div>
          {formData.order_by.length === 0 ? (
            <p className="text-sm text-gray-500">No sorting specified</p>
          ) : (
            <div className="space-y-2">
              {formData.order_by.map((order, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Column</label>
                    <Input
                      type="text"
                      value={order.column}
                      onChange={(e) => updateOrderBy(index, 'column', e.target.value)}
                      placeholder="column_name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Direction</label>
                    <select
                      value={order.direction}
                      onChange={(e) => updateOrderBy(index, 'direction', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOrderBy(index)}
                  >
                    <Icon icon="material-symbols:delete" className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Options</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit Results
              </label>
              <Input
                type="number"
                min="1"
                value={formData.limit_count}
                onChange={(e) => setFormData({ ...formData, limit_count: e.target.value })}
                placeholder="Leave empty for no limit"
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_shared}
                onChange={(e) => setFormData({ ...formData, is_shared: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Share this report with others</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? 'Creating...' : 'Create Report'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/reports')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

