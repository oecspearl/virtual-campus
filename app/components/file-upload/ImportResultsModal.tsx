'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface ImportResult {
  email: string;
  name: string;
  status: 'success' | 'error' | 'skipped';
  message?: string;
  error?: string;
}

interface ImportResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ImportResult[];
  totalProcessed: number;
  className?: string;
}

export default function ImportResultsModal({ 
  isOpen, 
  onClose, 
  results, 
  totalProcessed,
  className = '' 
}: ImportResultsModalProps) {
  if (!isOpen) return null;

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'material-symbols:check-circle';
      case 'error':
        return 'material-symbols:error';
      case 'skipped':
        return 'material-symbols:skip-next';
      default:
        return 'material-symbols:help';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'skipped':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'skipped':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-4xl bg-white rounded-lg ${className}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Icon icon="material-symbols:upload" className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Import Results</h2>
                <p className="text-sm text-gray-600">
                  {totalProcessed} users processed
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="material-symbols:close" className="w-5 h-5" />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="p-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center p-4 bg-green-50 rounded-lg border border-green-200"
              >
                <Icon icon="material-symbols:check-circle" className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{successCount}</div>
                <div className="text-sm text-green-700">Successfully Created</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-center p-4 bg-red-50 rounded-lg border border-red-200"
              >
                <Icon icon="material-symbols:error" className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                <div className="text-sm text-red-700">Failed</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <Icon icon="material-symbols:skip-next" className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{skippedCount}</div>
                <div className="text-sm text-yellow-700">Skipped</div>
              </motion.div>
            </div>
          </div>

          {/* Results List */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Results</h3>
            
            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Icon icon="material-symbols:inbox" className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No results to display</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-lg border ${getStatusBgColor(result.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon 
                          icon={getStatusIcon(result.status)} 
                          className={`w-5 h-5 ${getStatusColor(result.status)}`}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{result.name}</div>
                          <div className="text-sm text-gray-600">{result.email}</div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                          {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                        </div>
                        {result.message && (
                          <div className="text-xs text-gray-600 mt-1">
                            {result.message}
                          </div>
                        )}
                        {result.error && (
                          <div className="text-xs text-red-600 mt-1">
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {errorCount > 0 && (
              <button
                onClick={() => {
                  // Export failed users to CSV
                  const failedUsers = results.filter(r => r.status === 'error');
                  const csvContent = [
                    'email,name,role,error',
                    ...failedUsers.map(r => `${r.email},${r.name},,${r.error}`)
                  ].join('\n');
                  
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'failed-users.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Icon icon="material-symbols:download" className="w-4 h-4" />
                Export Failed Users
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
