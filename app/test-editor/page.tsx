'use client';

import React, { useState } from 'react';
import TextEditor from '@/app/components/editor/TextEditor';

export default function TestEditorPage() {
  const [content, setContent] = useState('<p>Start typing here to test the rich text editor...</p>');

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-normal text-slate-900 tracking-tight mb-6">Rich Text Editor Test</h1>
          <p className="text-gray-600 mb-8">
            Test all the formatting features of the rich text editor. Try bold, italic, headings, lists, 
            alignment, colors, and more!
          </p>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Editor</h2>
            <TextEditor 
              value={content}
              onChange={setContent}
              placeholder="Start typing to test the editor..."
            />
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview (Read-only)</h2>
            <TextEditor 
              value={content}
              onChange={() => {}}
              readOnly={true}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Raw HTML Output</h2>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              {content}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}


