'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import FileUploadDropzone from './FileUploadDropzone';
import CsvPreviewTable from './CsvPreviewTable';

interface UpdateResult {
  row: number;
  identifier: string;
  status: 'success' | 'error';
  message?: string;
  error?: string;
}

interface UserData {
  email: string;
  name: string;
  role: string;
  gender?: string;
  password?: string;
  course_ids?: string;
  grade_level?: string;
  subject_areas?: string;
  learning_style?: string;
  difficulty_preference?: string;
  bio?: string;
  parent_email?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkUserUpdateProps {
  onUpdateComplete?: () => void;
}

export default function BulkUserUpdate({ onUpdateComplete }: BulkUserUpdateProps) {
  const { supabase } = useSupabase();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  // CSV preview state
  const [csvData, setCsvData] = useState<UserData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'results'>('upload');

  const parseCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      const parsedData: UserData[] = [];
      const errors: ValidationError[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        try {
          const values = parseCsvLine(line);
          const userData: UserData = {
            email: values[headers.indexOf('email')]?.trim() || '',
            name: values[headers.indexOf('name')]?.trim() || '',
            role: values[headers.indexOf('role')]?.trim() || 'student',
            gender: values[headers.indexOf('gender')]?.trim() || '',
            password: values[headers.indexOf('password')]?.trim() || '',
            course_ids: values[headers.indexOf('course_ids')]?.trim() || '',
            grade_level: values[headers.indexOf('grade_level')]?.trim() || '',
            subject_areas: values[headers.indexOf('subject_areas')]?.trim() || '',
            learning_style: values[headers.indexOf('learning_style')]?.trim() || '',
            difficulty_preference: values[headers.indexOf('difficulty_preference')]?.trim() || '',
            bio: values[headers.indexOf('bio')]?.trim() || '',
            parent_email: values[headers.indexOf('parent_email')]?.trim() || ''
          };

          // Validate user data
          const userErrors = validateUserData(userData, i + 1);
          if (userErrors.length > 0) {
            errors.push(...userErrors);
          }

          parsedData.push(userData);
        } catch (error) {
          errors.push({
            row: i + 1,
            field: 'general',
            message: error instanceof Error ? error.message : 'Unknown parsing error'
          });
        }
      }

      setCsvData(parsedData);
      setValidationErrors(errors);
      setCurrentStep('preview');
      setError('');

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to parse CSV file');
    }
  };

  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        const cleanedValue = current.trim().replace(/^"|"$/g, '');
        values.push(cleanedValue);
        current = '';
      } else {
        current += char;
      }
    }
    
    const cleanedValue = current.trim().replace(/^"|"$/g, '');
    values.push(cleanedValue);
    return values;
  };

  const validateUserData = (userData: UserData, rowNumber: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!userData.email) {
      errors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push({ row: rowNumber, field: 'email', message: 'Invalid email format' });
    }
    
    if (!userData.name) {
      errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
    }
    
    if (userData.role && !['super_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent'].includes(userData.role)) {
      errors.push({ row: rowNumber, field: 'role', message: 'Invalid role' });
    }
    
    if (userData.gender && !['male', 'female', 'other', 'prefer_not_to_say'].includes(userData.gender)) {
      errors.push({ row: rowNumber, field: 'gender', message: 'Invalid gender' });
    }
    
    if (userData.password && userData.password.length < 8) {
      errors.push({ row: rowNumber, field: 'password', message: 'Password must be at least 8 characters' });
    }
    
    return errors;
  };

  const handleFileSelect = (file: File) => {
    setCsvFile(file);
    setError('');
    setUpdateResults([]);
    setShowResults(false);
    parseCsvFile(file);
  };

  const handleEdit = (index: number, field: string, value: string) => {
    setCsvData(prev => prev.map((user, i) => 
      i === index ? { ...user, [field]: value } : user
    ));
  };

  const handleStartUpdate = async () => {
    if (csvData.length === 0) return;

    setIsProcessing(true);
    setError('');

    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('You must be logged in to update users');
      }

      // Convert CSV data to the format expected by the API
      const csvContent = generateCsvFromData(csvData);

      const formData = new FormData();
      const blob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('csv', blob, 'update.csv');

      const response = await fetch('/api/admin/users/bulk-update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Update failed');
      }

      const result = await response.json();
      setUpdateResults(result.results);
      setCurrentStep('results');

      if (onUpdateComplete) {
        onUpdateComplete();
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateCsvFromData = (data: UserData[]): string => {
    const headers = ['email', 'name', 'role', 'gender', 'password', 'course_ids', 'grade_level', 'subject_areas', 'learning_style', 'difficulty_preference', 'bio', 'parent_email'];
    const csvRows = [headers.join(',')];
    
    data.forEach(user => {
      const row = headers.map(header => {
        const value = user[header as keyof UserData] || '';
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const handleReset = () => {
    setCsvFile(null);
    setCsvData([]);
    setValidationErrors([]);
    setUpdateResults([]);
    setShowResults(false);
    setCurrentStep('upload');
    setError('');
  };

  const successCount = updateResults.filter(r => r.status === 'success').length;
  const errorCount = updateResults.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Icon icon="material-symbols:info" className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-2">CSV Bulk Update Instructions</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• CSV must include either <strong>email</strong> or <strong>id</strong> column to identify users</li>
              <li>• Include only the fields you want to update (name, role, gender, password, bio, etc.)</li>
              <li>• Password must be at least 8 characters if provided</li>
              <li>• Gender values: male, female, other, prefer_not_to_say</li>
              <li>• Role values: super_admin, admin, instructor, curriculum_designer, student, parent</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CSV Template Download */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-2">Download Template</h4>
        <p className="text-sm text-gray-600 mb-3">
          Download a sample CSV template to see the correct format
        </p>
        <button
          onClick={() => {
            const template = 'email,name,role,gender,password,bio,grade_level,subject_areas,learning_style,difficulty_preference\n' +
                           'user@example.com,Updated Name,student,male,newpass123,"Updated bio",Grade 11,"Math,Science",visual,intermediate';
            const blob = new Blob([template], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bulk-update-template.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Icon icon="material-symbols:download" className="w-5 h-5" />
          Download Template
        </button>
      </div>

      {currentStep === 'upload' ? (
        <>
          {/* File Upload */}
          {!csvFile ? (
            <FileUploadDropzone
              onFileSelect={handleFileSelect}
              acceptedTypes={['.csv', 'text/csv']}
              maxSize={10}
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{csvFile.name}</h3>
                    <p className="text-sm text-gray-600">
                      {(csvFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReset}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Icon icon="material-symbols:close" className="w-6 h-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 mr-2" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleStartUpdate}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing && <Icon icon="material-symbols:loading" className="w-5 h-5 animate-spin" />}
                  {isProcessing ? 'Processing...' : 'Start Bulk Update'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={isProcessing}
                  className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      ) : currentStep === 'preview' ? (
        <>
          {/* CSV Preview */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:preview" className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Preview & Edit Data</h3>
                  <p className="text-sm text-gray-600">
                    Review and edit the data before updating users
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-gray-600 hover:text-gray-900"
              >
                <Icon icon="material-symbols:close" className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600 mr-2" />
                  <span className="text-red-800">{error}</span>
                </div>
              </div>
            )}

            <CsvPreviewTable
              data={csvData}
              errors={validationErrors}
              onEdit={handleEdit}
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleStartUpdate}
                disabled={isProcessing || csvData.length === 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing && <Icon icon="material-symbols:loading" className="w-5 h-5 animate-spin" />}
                {isProcessing ? 'Processing...' : 'Start Bulk Update'}
              </button>
              <button
                onClick={handleReset}
                disabled={isProcessing}
                className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Results */
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:list" className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{updateResults.length}</div>
                  <div className="text-sm text-gray-600">Total Processed</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                  <div className="text-sm text-gray-600">Successful</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Row</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {updateResults.map((result, index) => (
                    <tr key={index} className={result.status === 'error' ? 'bg-red-50' : 'bg-white'}>
                      <td className="px-4 py-3 text-sm text-gray-900">{result.row}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{result.identifier}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          result.status === 'success' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <Icon 
                            icon={result.status === 'success' ? 'material-symbols:check-circle' : 'material-symbols:error'} 
                            className="w-4 h-4" 
                          />
                          {result.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {result.message || result.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update More Users
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

