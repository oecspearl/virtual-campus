'use client';

import React from 'react';
import HelpExample from '@/app/components/HelpExample';
import { Icon } from '@iconify/react';

export default function HelpDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Help System Demo
            </h1>
            <p className="text-lg text-gray-600">
              This page demonstrates all the help system components and features.
            </p>
          </div>
          
          <HelpExample />
          
          <div className="mt-12 bg-blue-50 border-l-4 border-blue-400 p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <Icon icon="mdi:information" className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-900">
                  Ready to Use
                </h3>
                <p className="text-blue-700 mt-2">
                  The help system is now fully integrated into your application. 
                  Users can access help through the floating help button, navigation menu, 
                  or contextual tooltips throughout the platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
