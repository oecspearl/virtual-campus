'use client';

import React, { useState } from 'react';
import AutoResizeTextContent from '@/app/components/AutoResizeTextContent';
import TextEditor from '@/app/components/TextEditor';

export default function TestAutoResizePage() {
  const [content, setContent] = useState(`
    <h2>Short Content</h2>
    <p>This is a short text content that should have a smaller height.</p>
  `);

  const [longContent, setLongContent] = useState(`
    <h2>Long Content Example</h2>
    <p>This is a much longer text content that demonstrates how the auto-resize functionality works. The container should automatically adjust its height based on the amount of content.</p>
    
    <h3>Features of Auto-Resize:</h3>
    <ul>
      <li>Automatically adjusts height based on content</li>
      <li>Has minimum and maximum height constraints</li>
      <li>Smooth transitions when content changes</li>
      <li>Works with rich text content including HTML</li>
      <li>Responsive design that adapts to different screen sizes</li>
      <li>Handles images and complex layouts</li>
      <li>Prevents content from being cut off</li>
    </ul>
    
    <h3>Benefits:</h3>
    <ol>
      <li>Better user experience - no wasted space</li>
      <li>Consistent layout across different content lengths</li>
      <li>Professional appearance</li>
      <li>Easy to maintain and update</li>
      <li>All content is always visible</li>
    </ol>
    
    <blockquote>
      <p>This is a blockquote that demonstrates how different HTML elements are handled within the auto-resizing container. The container should expand to show all content without cutting anything off.</p>
    </blockquote>
    
    <p>You can add as much content as you want, and the container will automatically resize to accommodate it, up to the maximum height limit. If the content exceeds the maximum height, it will show a scrollbar instead of cutting off the content.</p>
    
    <h3>Technical Details:</h3>
    <p>The auto-resize system uses ResizeObserver and MutationObserver to detect content changes, and measures the actual content height using scrollHeight to ensure all content is visible.</p>
  `);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Auto-Resize Text Content Test</h1>
          <p className="text-gray-600 mb-8">
            This page demonstrates how text content containers automatically resize based on the amount of content.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Short Content Example */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Short Content</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <AutoResizeTextContent 
                  content={content}
                  title="Short Text Block"
                  minHeight={100}
                  maxHeight={1000}
                />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900">Edit Content:</h3>
              <TextEditor 
                value={content}
                onChange={setContent}
                height={200}
              />
            </div>

            {/* Long Content Example */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Long Content</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <AutoResizeTextContent 
                  content={longContent}
                  title="Long Text Block"
                  minHeight={150}
                  maxHeight={2000}
                />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900">Edit Content:</h3>
              <TextEditor 
                value={longContent}
                onChange={setLongContent}
                height={200}
              />
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works:</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• <strong>Minimum Height:</strong> Ensures content is never too small to read</li>
              <li>• <strong>Maximum Height:</strong> Prevents extremely tall content from breaking layout</li>
              <li>• <strong>Auto-Resize:</strong> Uses ResizeObserver to detect content changes</li>
              <li>• <strong>Smooth Transitions:</strong> CSS transitions make height changes smooth</li>
              <li>• <strong>Responsive:</strong> Works on all screen sizes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
