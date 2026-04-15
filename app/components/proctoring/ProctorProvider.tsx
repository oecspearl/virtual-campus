'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ProctorSettings, ProctorState, ProctorViolation, ViolationType, DEFAULT_PROCTOR_SETTINGS } from '@/types/proctor';
import ProctorWarningModal from './ProctorWarningModal';

interface ProctorContextType {
  state: ProctorState;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
  startProctoring: () => void;
  stopProctoring: () => void;
}

const ProctorContext = createContext<ProctorContextType | null>(null);

export function useProctor() {
  const context = useContext(ProctorContext);
  if (!context) {
    throw new Error('useProctor must be used within a ProctorProvider');
  }
  return context;
}

interface ProctorProviderProps {
  children: React.ReactNode;
  quizId: string;
  attemptId: string;
  settings?: Partial<ProctorSettings>;
  onAutoSubmit: () => void;
  enabled: boolean;
}

export default function ProctorProvider({
  children,
  quizId,
  attemptId,
  settings = {},
  onAutoSubmit,
  enabled,
}: ProctorProviderProps) {
  const proctorSettings: ProctorSettings = { ...DEFAULT_PROCTOR_SETTINGS, ...settings };

  const [state, setState] = useState<ProctorState>({
    isActive: false,
    isFullscreen: false,
    violationCount: 0,
    violations: [],
    showWarning: false,
    warningMessage: '',
    lastViolation: null,
  });

  const violationCountRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Log violation to backend
  const logViolation = useCallback(async (
    type: ViolationType,
    count: number,
    autoSubmitted: boolean = false,
    details: Record<string, unknown> = {}
  ) => {
    try {
      await fetch('/api/quizzes/proctor-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_id: quizId,
          quiz_attempt_id: attemptId,
          violation_type: type,
          violation_count: count,
          auto_submitted: autoSubmitted,
          violation_details: details,
        }),
      });
    } catch (error) {
      console.error('[Proctor] Failed to log violation:', error);
    }
  }, [quizId, attemptId]);

  // Handle a violation
  const handleViolation = useCallback((type: ViolationType, details: Record<string, unknown> = {}) => {
    if (!state.isActive || isSubmittingRef.current) return;

    violationCountRef.current += 1;
    const newCount = violationCountRef.current;

    const violation: ProctorViolation = {
      type,
      timestamp: new Date(),
      details,
    };

    const violationsRemaining = proctorSettings.max_violations - newCount;
    const shouldAutoSubmit = proctorSettings.auto_submit_on_violation && violationsRemaining <= 0;

    let warningMessage = '';
    switch (type) {
      case 'tab_switch':
        warningMessage = 'You switched to another tab or window.';
        break;
      case 'window_blur':
        warningMessage = 'You clicked outside the quiz window.';
        break;
      case 'fullscreen_exit':
        warningMessage = 'You exited fullscreen mode.';
        break;
      case 'right_click':
        warningMessage = 'Right-clicking is not allowed during this quiz.';
        break;
      case 'keyboard_shortcut':
        warningMessage = 'Keyboard shortcuts are not allowed during this quiz.';
        break;
      case 'copy_attempt':
        warningMessage = 'Copying is not allowed during this quiz.';
        break;
      case 'paste_attempt':
        warningMessage = 'Pasting is not allowed during this quiz.';
        break;
      default:
        warningMessage = 'A proctoring violation was detected.';
    }

    if (shouldAutoSubmit) {
      warningMessage += ' Your quiz has been automatically submitted.';
    } else if (violationsRemaining > 0) {
      warningMessage += ` Warning ${newCount}/${proctorSettings.max_violations}. ${violationsRemaining} violation(s) remaining before auto-submit.`;
    }

    setState(prev => ({
      ...prev,
      violationCount: newCount,
      violations: [...prev.violations, violation],
      showWarning: true,
      warningMessage,
      lastViolation: violation,
    }));

    // Log to backend
    logViolation(type, newCount, shouldAutoSubmit, details);

    // Auto-submit if max violations reached
    if (shouldAutoSubmit && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      setTimeout(() => {
        onAutoSubmit();
      }, 2000); // Give user 2 seconds to see the message
    }
  }, [state.isActive, proctorSettings.max_violations, proctorSettings.auto_submit_on_violation, logViolation, onAutoSubmit]);

  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setState(prev => ({ ...prev, isFullscreen: true }));
    } catch (error) {
      console.error('[Proctor] Failed to enter fullscreen:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
      setState(prev => ({ ...prev, isFullscreen: false }));
    } catch (error) {
      console.error('[Proctor] Failed to exit fullscreen:', error);
    }
  }, []);

  // Start proctoring
  const startProctoring = useCallback(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setState(prev => ({ ...prev, isActive: true }));

    if (proctorSettings.fullscreen_required) {
      enterFullscreen();
    }
  }, [proctorSettings.fullscreen_required, enterFullscreen]);

  // Stop proctoring
  const stopProctoring = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
    if (state.isFullscreen) {
      exitFullscreen();
    }
  }, [state.isFullscreen, exitFullscreen]);

  // Dismiss warning modal
  const dismissWarning = useCallback(() => {
    setState(prev => ({ ...prev, showWarning: false }));

    // Re-enter fullscreen if required and not already in fullscreen
    if (proctorSettings.fullscreen_required && !state.isFullscreen && !isSubmittingRef.current) {
      enterFullscreen();
    }
  }, [proctorSettings.fullscreen_required, state.isFullscreen, enterFullscreen]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled || !state.isActive) return;

    // Page Visibility API - detect tab switches
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab_switch', { visibilityState: document.visibilityState });
      }
    };

    // Window blur - detect clicking outside
    const handleWindowBlur = () => {
      // Small delay to avoid false positives from modals
      setTimeout(() => {
        if (!document.hasFocus() && state.isActive) {
          handleViolation('window_blur');
        }
      }, 100);
    };

    // Fullscreen change - detect exiting fullscreen
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      setState(prev => ({ ...prev, isFullscreen: isCurrentlyFullscreen }));

      if (!isCurrentlyFullscreen && proctorSettings.fullscreen_required && hasStartedRef.current) {
        handleViolation('fullscreen_exit');
      }
    };

    // Block right-click
    const handleContextMenu = (e: MouseEvent) => {
      if (proctorSettings.block_right_click) {
        e.preventDefault();
        handleViolation('right_click');
      }
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!proctorSettings.block_keyboard_shortcuts) return;

      const blockedCombos = [
        { ctrl: true, key: 'Tab' },      // Ctrl+Tab - switch tabs
        { alt: true, key: 'Tab' },       // Alt+Tab - switch windows
        { ctrl: true, key: 'n' },        // Ctrl+N - new window
        { ctrl: true, key: 't' },        // Ctrl+T - new tab
        { ctrl: true, key: 'w' },        // Ctrl+W - close tab
        { ctrl: true, key: 'c' },        // Ctrl+C - copy
        { ctrl: true, key: 'v' },        // Ctrl+V - paste
        { ctrl: true, key: 'a' },        // Ctrl+A - select all
        { ctrl: true, key: 'p' },        // Ctrl+P - print
        { ctrl: true, key: 's' },        // Ctrl+S - save
        { ctrl: true, key: 'f' },        // Ctrl+F - find
        { ctrl: true, shift: true, key: 'i' }, // Ctrl+Shift+I - dev tools
        { key: 'F12' },                  // F12 - dev tools
        { key: 'F5' },                   // F5 - refresh
        { ctrl: true, key: 'r' },        // Ctrl+R - refresh
        { key: 'Escape' },               // Escape - might exit fullscreen
      ];

      for (const combo of blockedCombos) {
        const matches =
          (combo.ctrl === undefined || combo.ctrl === e.ctrlKey) &&
          (combo.alt === undefined || combo.alt === e.altKey) &&
          (combo.shift === undefined || combo.shift === e.shiftKey) &&
          (e.key === combo.key || e.code === combo.key);

        if (matches) {
          e.preventDefault();
          e.stopPropagation();

          // Special handling for copy/paste
          if (combo.key === 'c' && combo.ctrl) {
            handleViolation('copy_attempt', { key: e.key });
          } else if (combo.key === 'v' && combo.ctrl) {
            handleViolation('paste_attempt', { key: e.key });
          } else {
            handleViolation('keyboard_shortcut', { key: e.key, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey });
          }
          return;
        }
      }
    };

    // Block copy/paste via clipboard API
    const handleCopy = (e: ClipboardEvent) => {
      if (proctorSettings.block_keyboard_shortcuts) {
        e.preventDefault();
        handleViolation('copy_attempt');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (proctorSettings.block_keyboard_shortcuts) {
        e.preventDefault();
        handleViolation('paste_attempt');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [enabled, state.isActive, proctorSettings, handleViolation]);

  // Warn before closing tab
  useEffect(() => {
    if (!enabled || !state.isActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an active quiz in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, state.isActive]);

  const contextValue: ProctorContextType = {
    state,
    enterFullscreen,
    exitFullscreen,
    startProctoring,
    stopProctoring,
  };

  // If not enabled, just render children without proctoring
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <ProctorContext.Provider value={contextValue}>
      <div
        className="proctor-container"
        style={{
          userSelect: state.isActive && proctorSettings.block_keyboard_shortcuts ? 'none' : 'auto',
        }}
      >
        {children}
      </div>

      <ProctorWarningModal
        isOpen={state.showWarning}
        onClose={dismissWarning}
        message={state.warningMessage}
        violationCount={state.violationCount}
        maxViolations={proctorSettings.max_violations}
        isAutoSubmitting={isSubmittingRef.current}
      />
    </ProctorContext.Provider>
  );
}
