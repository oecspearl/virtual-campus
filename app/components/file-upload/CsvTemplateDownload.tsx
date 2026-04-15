'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface CsvTemplateDownloadProps {
  className?: string;
}

export default function CsvTemplateDownload({ className = '' }: CsvTemplateDownloadProps) {
  const generateTemplate = () => {
    const headers = [
      'email',
      'name', 
      'role',
      'grade_level',
      'subject_areas',
      'learning_style',
      'difficulty_preference',
      'bio',
      'parent_email'
    ];

    const sampleData = [
      [
        'john.doe@school.edu',
        'John Doe',
        'student',
        'Grade 10',
        'Math,Science',
        'visual',
        'intermediate',
        'Math enthusiast',
        'parent@email.com'
      ],
      [
        'jane.smith@school.edu',
        'Jane Smith',
        'instructor',
        'Grade 12',
        'English,History',
        'auditory',
        'advanced',
        'English teacher',
        ''
      ],
      [
        'admin@school.edu',
        'Admin User',
        'admin',
        '',
        '',
        '',
        '',
        'System administrator',
        ''
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const downloadTemplate = () => {
    const csvContent = generateTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'user-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadInstructions = () => {
    const instructions = `CSV Import Instructions

REQUIRED FIELDS:
- email: Valid email address (must be unique)
- name: Full name of the user
- role: One of: super_admin, admin, instructor, curriculum_designer, student, parent

OPTIONAL FIELDS:
- grade_level: e.g., "Grade 10", "Grade 12"
- subject_areas: Comma-separated list, e.g., "Math,Science"
- learning_style: One of: visual, auditory, kinesthetic, reading
- difficulty_preference: One of: beginner, intermediate, advanced
- bio: Short biography or description
- parent_email: Parent's email (for student accounts)

IMPORTANT NOTES:
- Use commas to separate values
- Wrap text containing commas in quotes
- Leave optional fields empty if not needed
- Email addresses must be unique
- Role must be one of the allowed values
- File size limit: 10MB
- Maximum users per import: 1000

EXAMPLE:
email,name,role,grade_level,subject_areas
"student@school.edu","John Doe","student","Grade 10","Math,Science"
"teacher@school.edu","Jane Smith","instructor","Grade 12","English,History"`;

    const blob = new Blob([instructions], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'csv-import-instructions.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon icon="material-symbols:info" className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-800">CSV Template & Instructions</h3>
        </div>
        <p className="text-sm text-blue-700 mb-4">
          Download the CSV template to see the required format and get started with bulk user imports.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            onClick={downloadTemplate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Icon icon="material-symbols:download" className="w-4 h-4" />
            Download CSV Template
          </motion.button>
          
          <motion.button
            onClick={downloadInstructions}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            <Icon icon="material-symbols:help" className="w-4 h-4" />
            Download Instructions
          </motion.button>
        </div>
      </div>

      {/* Field Requirements */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Field Requirements</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Required Fields</h5>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:check-circle" className="w-3 h-3 text-green-600" />
                <span><strong>email</strong> - Valid email address</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:check-circle" className="w-3 h-3 text-green-600" />
                <span><strong>name</strong> - Full name</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:check-circle" className="w-3 h-3 text-green-600" />
                <span><strong>role</strong> - User role</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Optional Fields</h5>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:info" className="w-3 h-3 text-blue-600" />
                <span><strong>grade_level</strong> - Grade level</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:info" className="w-3 h-3 text-blue-600" />
                <span><strong>subject_areas</strong> - Subject interests</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:info" className="w-3 h-3 text-blue-600" />
                <span><strong>learning_style</strong> - Learning preference</span>
              </li>
              <li className="flex items-center gap-2">
                <Icon icon="material-symbols:info" className="w-3 h-3 text-blue-600" />
                <span><strong>bio</strong> - Biography</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Role Options */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Available Roles</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            'super_admin',
            'admin', 
            'instructor',
            'curriculum_designer',
            'student',
            'parent'
          ].map(role => (
            <div key={role} className="text-sm text-gray-600 bg-white px-3 py-2 rounded border">
              {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
