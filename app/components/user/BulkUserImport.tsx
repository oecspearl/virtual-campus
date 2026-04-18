'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useSupabase } from '@/lib/supabase-provider';
import { tenantFetch } from '@/lib/hooks/useTenantSwitcher';
import FileUploadDropzone from '@/app/components/file-upload/FileUploadDropzone';
import CsvPreviewTable from '@/app/components/file-upload/CsvPreviewTable';
import BulkImportProgress from '@/app/components/BulkImportProgress';
import ImportResultsModal from '@/app/components/file-upload/ImportResultsModal';
import CsvTemplateDownload from '@/app/components/file-upload/CsvTemplateDownload';

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

interface ImportResult {
  email: string;
  name: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  error?: string;
}

type ImportStep = 'upload' | 'preview' | 'processing' | 'completed';

export default function BulkUserImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const { supabase } = useSupabase();
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<UserData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');

  const parseCsvFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataLines = lines.slice(1);

      // Validate headers
      const requiredHeaders = ['email', 'name', 'role'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Parse data
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
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  };

  const validateUserData = (userData: UserData, rowNumber: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Email validation
    if (!userData.email) {
      errors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(userData.email)) {
      errors.push({ row: rowNumber, field: 'email', message: 'Invalid email format' });
    }
    
    // Name validation
    if (!userData.name) {
      errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
    }
    
    // Role validation
    const allowedRoles = ['super_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent'];
    if (!userData.role) {
      errors.push({ row: rowNumber, field: 'role', message: 'Role is required' });
    } else if (!allowedRoles.includes(userData.role)) {
      errors.push({ row: rowNumber, field: 'role', message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }
    
    return errors;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleFileSelect = (file: File) => {
    setCsvFile(file);
    parseCsvFile(file);
  };

  const handleEditUser = (index: number, field: string, value: string) => {
    const updatedData = [...csvData];
    updatedData[index] = { ...updatedData[index], [field]: value };
    setCsvData(updatedData);

    // Re-validate the edited user
    const userErrors = validateUserData(updatedData[index], index + 1);
    const otherErrors = validationErrors.filter(e => e.row !== index + 1);
    setValidationErrors([...otherErrors, ...userErrors]);
  };

  const handleRemoveUser = (index: number) => {
    const updatedData = csvData.filter((_, i) => i !== index);
    setCsvData(updatedData);
    
    // Update validation errors
    const updatedErrors = validationErrors
      .filter(e => e.row !== index + 1)
      .map(e => e.row > index + 1 ? { ...e, row: e.row - 1 } : e);
    setValidationErrors(updatedErrors);
  };

  const handleStartImport = async () => {
    if (!csvFile) return;

    setIsProcessing(true);
    setCurrentStep('processing');
    setProgress({ current: 0, total: csvData.length });
    setError('');

    try {
      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('You must be logged in to import users');
      }

      const formData = new FormData();
      formData.append('csv', csvFile);

      const response = await tenantFetch('/api/admin/users/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      setImportResults(result.results);
      setCurrentStep('completed');
      setShowResults(true);

      if (onImportComplete) {
        onImportComplete();
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Import failed');
      setCurrentStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setCsvFile(null);
    setCsvData([]);
    setValidationErrors([]);
    setImportResults([]);
    setProgress({ current: 0, total: 0 });
    setCurrentUser('');
    setShowResults(false);
    setError('');
  };

  const criticalErrors = validationErrors.filter(e => ['email', 'name', 'role'].includes(e.field));
  const canProceed = csvData.length > 0 && criticalErrors.length === 0;

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {['upload', 'preview', 'processing', 'completed'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${currentStep === step 
                ? 'bg-blue-600 text-white' 
                : ['upload', 'preview', 'processing', 'completed'].indexOf(currentStep) > index
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-600'
              }
            `}>
              {index + 1}
            </div>
            {index < 3 && (
              <div className={`w-12 h-0.5 mx-2 ${
                ['upload', 'preview', 'processing', 'completed'].indexOf(currentStep) > index
                  ? 'bg-green-600'
                  : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2"
        >
          <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </motion.div>
      )}

      {/* Step Content */}
      {currentStep === 'upload' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bulk User Import</h2>
            <p className="text-gray-600">Upload a CSV file to create multiple users at once</p>
          </div>

          <FileUploadDropzone onFileSelect={handleFileSelect} />
          <CsvTemplateDownload />
        </motion.div>
      )}

      {currentStep === 'preview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Preview Import Data</h2>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Icon icon="material-symbols:refresh" className="w-4 h-4 mr-2" />
              Start Over
            </button>
          </div>

          <CsvPreviewTable
            data={csvData}
            errors={validationErrors}
            onEdit={handleEditUser}
            onRemove={handleRemoveUser}
          />

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {canProceed 
                ? `Ready to import ${csvData.length} users`
                : `Fix ${criticalErrors.length} critical errors to proceed`
              }
            </div>
            <button
              onClick={handleStartImport}
              disabled={!canProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Icon icon="material-symbols:upload" className="w-4 h-4" />
              Start Import
            </button>
          </div>
        </motion.div>
      )}

      {currentStep === 'processing' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Import</h2>
            <p className="text-gray-600">Creating users, please wait...</p>
          </div>

          <BulkImportProgress
            current={progress.current}
            total={progress.total}
            status="processing"
            currentUser={currentUser}
          />
        </motion.div>
      )}

      {currentStep === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Completed</h2>
            <p className="text-gray-600">Your bulk import has been processed</p>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import More Users
            </button>
            <button
              onClick={() => setShowResults(true)}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View Results
            </button>
          </div>
        </motion.div>
      )}

      {/* Results Modal */}
      <ImportResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        results={importResults}
        totalProcessed={csvData.length}
      />
    </div>
  );
}
