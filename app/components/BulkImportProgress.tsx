'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface BulkImportProgressProps {
  current: number;
  total: number;
  status: 'idle' | 'validating' | 'processing' | 'completed' | 'error';
  currentUser?: string;
  errors?: string[];
  className?: string;
}

export default function BulkImportProgress({ 
  current, 
  total, 
  status, 
  currentUser,
  errors = [],
  className = '' 
}: BulkImportProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  
  const getStatusInfo = () => {
    switch (status) {
      case 'idle':
        return {
          icon: 'material-symbols:hourglass-empty',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: 'Ready to start'
        };
      case 'validating':
        return {
          icon: 'material-symbols:search',
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          text: 'Validating data...'
        };
      case 'processing':
        return {
          icon: 'material-symbols:sync',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          text: 'Creating users...'
        };
      case 'completed':
        return {
          icon: 'material-symbols:check-circle',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Import completed!'
        };
      case 'error':
        return {
          icon: 'material-symbols:error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: 'Import failed'
        };
      default:
        return {
          icon: 'material-symbols:help',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          text: 'Unknown status'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusInfo.bgColor}`}>
            <Icon 
              icon={statusInfo.icon} 
              className={`w-5 h-5 ${statusInfo.color} ${status === 'processing' ? 'animate-spin' : ''}`}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {statusInfo.text}
            </h3>
            <p className="text-sm text-gray-600">
              {current} of {total} users processed
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(percentage)}%
          </div>
          <div className="text-sm text-gray-600">
            {current}/{total}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all duration-500 ${
              status === 'completed' 
                ? 'bg-gradient-to-r from-green-500 to-green-600'
                : status === 'error'
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        
        {/* Progress Steps */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Started</span>
          <span>In Progress</span>
          <span>Completed</span>
        </div>
      </div>

      {/* Current User Processing */}
      {currentUser && status === 'processing' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <Icon icon="material-symbols:person" className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              Processing: <span className="font-medium">{currentUser}</span>
            </span>
          </div>
        </motion.div>
      )}

      {/* Error Display */}
      {errors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="material-symbols:error" className="w-4 h-4 text-red-600" />
            <h4 className="font-semibold text-red-800">Processing Errors</h4>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {errors.map((error, index) => (
              <div key={index} className="text-sm text-red-700">
                • {error}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Status Messages */}
      {status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">
              All users have been successfully processed!
            </span>
          </div>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <Icon icon="material-symbols:error" className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">
              Import failed. Please check the errors above and try again.
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
