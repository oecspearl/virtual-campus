'use client';

import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface FileUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
}

export default function FileUploadDropzone({ 
  onFileSelect, 
  acceptedTypes = ['.csv', 'text/csv'],
  maxSize = 10,
  className = ''
}: FileUploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    if (!acceptedTypes.includes(fileExtension) && !acceptedTypes.includes(mimeType)) {
      return 'Please upload a CSV file (.csv)';
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  const handleFile = useCallback((file: File) => {
    setError('');
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect, maxSize, acceptedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className={`relative ${className}`}>
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${error ? 'border-red-500 bg-red-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input
          id="file-input"
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <Icon 
              icon={isDragOver ? "material-symbols:cloud-upload" : "material-symbols:upload-file"} 
              className="w-8 h-8 text-white" 
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragOver ? 'Drop your CSV file here' : 'Upload CSV File'}
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Drag and drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-gray-500">
              Supports .csv files up to {maxSize}MB
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Icon icon="material-symbols:info" className="w-4 h-4" />
            <span>Required format: email, name, role</span>
          </div>
        </motion.div>

        {/* Drag overlay */}
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-blue-500/10 rounded-xl flex items-center justify-center"
          >
            <div className="text-blue-600 font-semibold text-lg">
              Drop to upload
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
        >
          <Icon icon="material-symbols:error" className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </motion.div>
      )}
    </div>
  );
}
