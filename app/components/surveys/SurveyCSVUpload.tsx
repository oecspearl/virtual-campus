"use client";

import React from "react";
import { Icon } from "@iconify/react";
import Button from "@/app/components/Button";

interface SurveyCSVUploadProps {
  courseId?: string;
  lessonId?: string;
  onImport: (survey: any) => void;
  onClose: () => void;
}

export default function SurveyCSVUpload({
  courseId,
  lessonId,
  onImport,
  onClose
}: SurveyCSVUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (courseId) formData.append('course_id', courseId);
      if (lessonId) formData.append('lesson_id', lessonId);

      const response = await fetch('/api/surveys/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload survey');
      }

      onImport(data.survey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <Icon icon="material-symbols:upload-file" className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-medium">Import Survey from CSV</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Icon icon="material-symbols:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleChange}
              className="hidden"
            />

            {uploading ? (
              <div className="flex flex-col items-center">
                <Icon icon="material-symbols:progress-activity" className="w-12 h-12 text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Icon icon="material-symbols:cloud-upload" className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Drag and drop your CSV file here, or
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  browse to select a file
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          {/* CSV Format Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">CSV Format</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Row 1:</strong> title,description,survey_type,is_anonymous</p>
              <p><strong>Row 2:</strong> Survey data (title, description, type, true/false)</p>
              <p><strong>Row 3:</strong> Empty or header row</p>
              <p><strong>Row 4:</strong> question_type,question_text,required,option1,option2,...</p>
              <p><strong>Row 5+:</strong> Question data</p>
            </div>
            <div className="mt-3">
              <a
                href="/survey-csv-template.csv"
                download
                className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1"
              >
                <Icon icon="material-symbols:download" className="w-4 h-4" />
                Download template
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
