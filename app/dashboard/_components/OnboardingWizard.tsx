'use client';

import React from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';

const STORAGE_KEY = 'vc-onboarding-complete';

const steps = [
  {
    icon: 'mdi:hand-wave',
    title: 'Welcome to Virtual Campus!',
    description: 'Your personalized learning journey starts here. Let us show you around so you can get the most out of your experience.',
    color: 'var(--theme-primary)',
  },
  {
    icon: 'mdi:book-search',
    title: 'Discover Courses',
    description: 'Browse our course catalog to find subjects that interest you. Filter by difficulty, category, or search by keyword. Enroll in any course with a single click.',
    color: 'var(--theme-secondary, var(--theme-primary))',
  },
  {
    icon: 'mdi:rocket-launch',
    title: 'Start Learning',
    description: 'Once enrolled, your courses appear on your dashboard with progress tracking. Jump right in — your "Continue Learning" card always shows where you left off.',
    color: 'var(--theme-primary)',
  },
];

export default function OnboardingWizard({ userName }: { userName: string }) {
  const [visible, setVisible] = React.useState(false);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(STORAGE_KEY);
      if (!completed) {
        setVisible(true);
      }
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!visible) return null;

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Progress indicator */}
        <div className="flex gap-1.5 px-8 pt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full flex-1 transition-all duration-300"
              style={{
                backgroundColor: i <= step
                  ? 'var(--theme-primary)'
                  : '#e5e7eb',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-8 pt-6 pb-4 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-colors duration-300"
            style={{
              backgroundColor: `color-mix(in srgb, ${currentStep.color} 12%, transparent)`,
            }}
          >
            <Icon
              icon={currentStep.icon}
              className="w-9 h-9 transition-colors duration-300"
              style={{ color: currentStep.color }}
            />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {step === 0
              ? currentStep.title.replace('!', `, ${userName || 'Learner'}!`)
              : currentStep.title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
            {currentStep.description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 pt-4 flex items-center justify-between gap-3">
          <div>
            {step > 0 && (
              <button
                onClick={handleBack}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-2"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isLast && (
              <button
                onClick={handleComplete}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-2"
              >
                Skip
              </button>
            )}

            {isLast ? (
              <Link
                href="/courses"
                onClick={handleComplete}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary, var(--theme-primary)))' }}
              >
                <Icon icon="mdi:book-search" className="w-4 h-4" />
                Browse Courses
              </Link>
            ) : (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary, var(--theme-primary)))' }}
              >
                Next
                <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
