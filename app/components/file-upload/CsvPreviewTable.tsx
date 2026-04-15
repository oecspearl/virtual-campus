'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

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

interface CsvPreviewTableProps {
  data: UserData[];
  errors: ValidationError[];
  onEdit?: (index: number, field: string, value: string) => void;
  onRemove?: (index: number) => void;
  className?: string;
}

const ALLOWED_ROLES = ['super_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent'];
const ALLOWED_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

export default function CsvPreviewTable({ 
  data, 
  errors, 
  onEdit, 
  onRemove,
  className = '' 
}: CsvPreviewTableProps) {
  const getFieldError = (rowIndex: number, field: string): ValidationError | undefined => {
    return errors.find(error => error.row === rowIndex && error.field === field);
  };

  const getRowErrors = (rowIndex: number): ValidationError[] => {
    return errors.filter(error => error.row === rowIndex);
  };

  const getErrorCount = (): { total: number; critical: number } => {
    const criticalFields = ['email', 'name', 'role'];
    const criticalErrors = errors.filter(error => criticalFields.includes(error.field));
    return {
      total: errors.length,
      critical: criticalErrors.length
    };
  };

  const errorStats = getErrorCount();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon icon="material-symbols:people" className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{data.length}</div>
              <div className="text-sm text-gray-600">Total Users</div>
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
              <div className="text-2xl font-bold text-green-600">{data.length - errorStats.critical}</div>
              <div className="text-sm text-gray-600">Valid Users</div>
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
              <div className="text-2xl font-bold text-red-600">{errorStats.critical}</div>
              <div className="text-sm text-gray-600">Critical Errors</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Icon icon="material-symbols:warning" className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{errorStats.total - errorStats.critical}</div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Row
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Email *
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name *
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role *
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Course IDs
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Grade Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Subject Areas
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((user, index) => {
                const rowErrors = getRowErrors(index);
                const hasErrors = rowErrors.length > 0;
                
                return (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`${hasErrors ? 'bg-red-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{index + 1}</span>
                        {hasErrors && (
                          <Icon icon="material-symbols:error" className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="relative">
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => onEdit?.(index, 'email', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            getFieldError(index, 'email') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        />
                        {getFieldError(index, 'email') && (
                          <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                            {getFieldError(index, 'email')?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={user.name}
                          onChange={(e) => onEdit?.(index, 'name', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            getFieldError(index, 'name') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        />
                        {getFieldError(index, 'name') && (
                          <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                            {getFieldError(index, 'name')?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={user.role}
                          onChange={(e) => onEdit?.(index, 'role', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            getFieldError(index, 'role') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select role</option>
                          {ALLOWED_ROLES.map(role => (
                            <option key={role} value={role}>
                              {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                        {getFieldError(index, 'role') && (
                          <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                            {getFieldError(index, 'role')?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={user.gender || ''}
                          onChange={(e) => onEdit?.(index, 'gender', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            getFieldError(index, 'gender') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select gender</option>
                          {ALLOWED_GENDERS.map(gender => (
                            <option key={gender} value={gender}>
                              {gender.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                          ))}
                        </select>
                        {getFieldError(index, 'gender') && (
                          <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                            {getFieldError(index, 'gender')?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="relative">
                        <input
                          type="password"
                          value={user.password || ''}
                          onChange={(e) => onEdit?.(index, 'password', e.target.value)}
                          placeholder="Leave empty for auto-generated"
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            getFieldError(index, 'password') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        />
                        {getFieldError(index, 'password') && (
                          <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                            {getFieldError(index, 'password')?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={user.course_ids || ''}
                          onChange={(e) => onEdit?.(index, 'course_ids', e.target.value)}
                          placeholder="Comma-separated course IDs"
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            getFieldError(index, 'course_ids') 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                        />
                        {getFieldError(index, 'course_ids') && (
                          <div className="absolute -bottom-6 left-0 text-xs text-red-600">
                            {getFieldError(index, 'course_ids')?.message}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={user.grade_level || ''}
                        onChange={(e) => onEdit?.(index, 'grade_level', e.target.value)}
                        placeholder="e.g., Grade 10"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={user.subject_areas || ''}
                        onChange={(e) => onEdit?.(index, 'subject_areas', e.target.value)}
                        placeholder="e.g., Math, Science"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onRemove?.(index)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Remove user"
                      >
                        <Icon icon="material-symbols:delete" className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Summary */}
      {errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-red-800">Validation Errors</h4>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                <span className="font-medium">Row {error.row + 1}, {error.field}:</span> {error.message}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
