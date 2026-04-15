'use client';

import React from 'react';
import HelpTooltip from './HelpTooltip';
import HelpButton from './HelpButton';
import { useHelp } from './HelpContext';
import { Icon } from '@iconify/react';

// Example component showing how to use help components
export default function HelpExample() {
  const { openHelp } = useHelp();

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Help System Examples</h2>
      
      {/* Help Tooltip Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Help Tooltips</h3>
        
        <div className="flex items-center space-x-4">
          <span>What is this feature?</span>
          <HelpTooltip 
            content="This is a helpful explanation of the feature you're asking about."
            title="Feature Help"
          />
        </div>

        <div className="flex items-center space-x-4">
          <span>How do I use this?</span>
          <HelpTooltip 
            content={
              <div>
                <p>Here's how to use this feature:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Step 1: Do this first</li>
                  <li>Step 2: Then do this</li>
                  <li>Step 3: Finally, complete this</li>
                </ol>
              </div>
            }
            title="Usage Guide"
            position="right"
          />
        </div>

        <div className="flex items-center space-x-4">
          <span>Need more information?</span>
          <HelpTooltip 
            content="Click the help button in the bottom right corner for comprehensive help documentation."
            title="More Help"
            position="bottom"
          />
        </div>
      </div>

      {/* Help Button Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Help Buttons</h3>
        
        <div className="flex items-center space-x-4">
          <span>Fixed position help button (bottom right):</span>
          <HelpButton position="fixed" size="md" />
        </div>

        <div className="flex items-center space-x-4">
          <span>Inline help button:</span>
          <HelpButton position="inline" size="sm" />
        </div>

        <div className="flex items-center space-x-4">
          <span>Large help button:</span>
          <HelpButton position="inline" size="lg" />
        </div>
      </div>

      {/* Programmatic Help Opening */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Programmatic Help</h3>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => openHelp('getting-started')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Getting Started Help
          </button>
          
          <button 
            onClick={() => openHelp('troubleshooting')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Open Troubleshooting Help
          </button>
        </div>
      </div>

      {/* Custom Help Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Custom Help Content</h3>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Video Conference Help</span>
            <HelpTooltip 
              content={
                <div className="space-y-2">
                  <p className="font-medium">Video Conference Features:</p>
                  <ul className="text-sm space-y-1">
                    <li>• Click "Join Conference" to participate</li>
                    <li>• Allow camera and microphone permissions</li>
                    <li>• Use Chrome or Firefox for best experience</li>
                    <li>• Test your setup before important meetings</li>
                  </ul>
                </div>
              }
              title="Video Conference Help"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
