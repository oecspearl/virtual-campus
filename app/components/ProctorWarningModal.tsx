'use client';

import React, { useEffect } from 'react';

interface ProctorWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  violationCount: number;
  maxViolations: number;
  isAutoSubmitting: boolean;
}

export default function ProctorWarningModal({
  isOpen,
  onClose,
  message,
  violationCount,
  maxViolations,
  isAutoSubmitting,
}: ProctorWarningModalProps) {
  // Auto-close after 5 seconds if not auto-submitting
  useEffect(() => {
    if (isOpen && !isAutoSubmitting) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isAutoSubmitting, onClose]);

  if (!isOpen) return null;

  const violationsRemaining = maxViolations - violationCount;
  const isLastWarning = violationsRemaining <= 1 && violationsRemaining > 0;
  const isCritical = isAutoSubmitting || violationsRemaining <= 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-75" />

      {/* Modal */}
      <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl overflow-hidden ${
        isCritical ? 'bg-red-50 border-4 border-red-500' :
        isLastWarning ? 'bg-orange-50 border-4 border-orange-500' :
        'bg-yellow-50 border-4 border-yellow-500'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 ${
          isCritical ? 'bg-red-500' :
          isLastWarning ? 'bg-orange-500' :
          'bg-yellow-500'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isCritical ? 'bg-red-600' :
              isLastWarning ? 'bg-orange-600' :
              'bg-yellow-600'
            }`}>
              {isCritical ? (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isCritical ? 'Quiz Auto-Submitted' :
                 isLastWarning ? 'Final Warning!' :
                 'Proctoring Violation'}
              </h3>
              <p className="text-sm text-white/90">
                {isCritical ? 'Maximum violations exceeded' :
                 isLastWarning ? 'One more violation will submit your quiz' :
                 'Please return to your quiz'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className={`text-base ${
            isCritical ? 'text-red-800' :
            isLastWarning ? 'text-orange-800' :
            'text-yellow-800'
          }`}>
            {message}
          </p>

          {/* Violation counter */}
          {!isCritical && (
            <div className="mt-4 flex items-center justify-center space-x-1">
              {Array.from({ length: maxViolations }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < violationCount
                      ? 'bg-red-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Auto-submit countdown */}
          {isAutoSubmitting && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-red-100 rounded-lg">
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-red-700 font-medium">Submitting your quiz...</span>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!isCritical && (
            <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Safe Browser Rules:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex items-start space-x-2">
                  <span className="text-red-500">&#8226;</span>
                  <span>Do not switch to other tabs or windows</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500">&#8226;</span>
                  <span>Do not exit fullscreen mode</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500">&#8226;</span>
                  <span>Do not use right-click or keyboard shortcuts</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500">&#8226;</span>
                  <span>Copy and paste are disabled</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isAutoSubmitting && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={onClose}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                isCritical ? 'bg-red-500 hover:bg-red-600' :
                isLastWarning ? 'bg-orange-500 hover:bg-orange-600' :
                'bg-yellow-500 hover:bg-yellow-600'
              }`}
            >
              {isCritical ? 'View Results' : 'Return to Quiz'}
            </button>
            {!isCritical && (
              <p className="mt-2 text-xs text-center text-gray-500">
                This modal will auto-close in 5 seconds
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
