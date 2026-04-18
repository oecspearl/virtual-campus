'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { tenantFetch } from '@/lib/hooks/useTenantSwitcher';

interface UserReportProps {
  onReportGenerated?: () => void;
}

interface FieldGroup {
  name: string;
  fields: {
    id: string;
    label: string;
    description: string;
  }[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    name: 'Basic Information',
    fields: [
      { id: 'id', label: 'User ID', description: 'Unique user identifier' },
      { id: 'email', label: 'Email', description: 'User email address' },
      { id: 'name', label: 'Name', description: 'Full name' },
      { id: 'role', label: 'Role', description: 'User role (admin, student, etc.)' },
      { id: 'gender', label: 'Gender', description: 'User gender' },
      { id: 'created_at', label: 'Created Date', description: 'Account creation date' },
      { id: 'updated_at', label: 'Last Updated', description: 'Last profile update' }
    ]
  },
  {
    name: 'Profile Information',
    fields: [
      { id: 'bio', label: 'Biography', description: 'User biography text' },
      { id: 'avatar', label: 'Avatar URL', description: 'Profile picture URL' }
    ]
  },
  {
    name: 'Learning Preferences',
    fields: [
      { id: 'grade_level', label: 'Grade Level', description: 'Academic grade level' },
      { id: 'subject_areas', label: 'Subject Areas', description: 'Areas of interest' },
      { id: 'learning_style', label: 'Learning Style', description: 'Preferred learning method' },
      { id: 'difficulty_preference', label: 'Difficulty Preference', description: 'Preferred difficulty level' }
    ]
  },
  {
    name: 'Enrollment Statistics',
    fields: [
      { id: 'enrollment_count', label: 'Total Enrollments', description: 'Number of course enrollments' },
      { id: 'active_enrollments', label: 'Active Enrollments', description: 'Currently active enrollments' },
      { id: 'completed_enrollments', label: 'Completed Enrollments', description: 'Finished courses' },
      { id: 'enrolled_courses', label: 'Enrolled Courses', description: 'List of enrolled course titles' }
    ]
  }
];

const ROLE_FILTERS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'instructor', label: 'Instructor' },
  { value: 'curriculum_designer', label: 'Curriculum Designer' },
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' }
];

const GENDER_FILTERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' }
];

export default function UserReport({ onReportGenerated }: UserReportProps) {
  const [selectedFields, setSelectedFields] = useState<string[]>(['email', 'name', 'role']);
  const [filters, setFilters] = useState({
    role: [] as string[],
    gender: [] as string[],
    created_after: '',
    created_before: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(f => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAll = (groupFields: string[]) => {
    const allSelected = groupFields.every(field => selectedFields.includes(field));
    
    if (allSelected) {
      // Deselect all fields in this group
      setSelectedFields(prev => prev.filter(field => !groupFields.includes(field)));
    } else {
      // Select all fields in this group
      setSelectedFields(prev => [...new Set([...prev, ...groupFields])]);
    }
  };

  const handleFilterChange = (filterType: string, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleGenerateReport = async () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field to include in the report');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await tenantFetch('/api/admin/users/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fields: selectedFields,
          filters: filters
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `user-report-${new Date().toISOString().split('T')[0]}.csv`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (onReportGenerated) {
        onReportGenerated();
      }

    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setSelectedFields(['email', 'name', 'role']);
    setFilters({
      role: [],
      gender: [],
      created_after: '',
      created_before: ''
    });
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Icon icon="material-symbols:info" className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">User Report Generator</h4>
            <p className="text-sm text-blue-800">
              Select the fields you want to include in your CSV report. You can also apply filters to include only specific users.
            </p>
          </div>
        </div>
      </div>

      {/* Field Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Fields to Include</h3>
        
        <div className="space-y-6">
          {FIELD_GROUPS.map((group, groupIndex) => {
            const groupFieldIds = group.fields.map(f => f.id);
            const allSelected = groupFieldIds.every(field => selectedFields.includes(field));
            const someSelected = groupFieldIds.some(field => selectedFields.includes(field));

            return (
              <div key={group.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">{group.name}</h4>
                  <button
                    onClick={() => handleSelectAll(groupFieldIds)}
                    className={`text-sm px-3 py-1 rounded-md transition-colors ${
                      allSelected 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.fields.map((field) => (
                    <label
                      key={field.id}
                      className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFields.includes(field.id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleFieldToggle(field.id)}
                        className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{field.label}</div>
                        <div className="text-sm text-gray-600">{field.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Apply Filters (Optional)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Role
            </label>
            <div className="space-y-2">
              {ROLE_FILTERS.map((role) => (
                <label key={role.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.role.includes(role.value)}
                    onChange={(e) => {
                      const newRoles = e.target.checked
                        ? [...filters.role, role.value]
                        : filters.role.filter(r => r !== role.value);
                      handleFilterChange('role', newRoles);
                    }}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{role.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Gender Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Gender
            </label>
            <div className="space-y-2">
              {GENDER_FILTERS.map((gender) => (
                <label key={gender.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.gender.includes(gender.value)}
                    onChange={(e) => {
                      const newGenders = e.target.checked
                        ? [...filters.gender, gender.value]
                        : filters.gender.filter(g => g !== gender.value);
                      handleFilterChange('gender', newGenders);
                    }}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{gender.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Created After
            </label>
            <input
              type="date"
              value={filters.created_after}
              onChange={(e) => handleFilterChange('created_after', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Created Before
            </label>
            <input
              type="date"
              value={filters.created_before}
              onChange={(e) => handleFilterChange('created_before', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || selectedFields.length === 0}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isGenerating && <Icon icon="material-symbols:loading" className="w-5 h-5 animate-spin" />}
          <Icon icon="material-symbols:download" className="w-5 h-5" />
          {isGenerating ? 'Generating Report...' : 'Download Report'}
        </button>
        <button
          onClick={handleReset}
          disabled={isGenerating}
          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      {/* Selected Fields Summary */}
      {selectedFields.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-900">
              {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="text-sm text-green-800">
            {selectedFields.map(fieldId => {
              const field = FIELD_GROUPS.flatMap(g => g.fields).find(f => f.id === fieldId);
              return field?.label;
            }).filter(Boolean).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

