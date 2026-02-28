export interface ProctorSettings {
  max_violations: number;
  fullscreen_required: boolean;
  block_right_click: boolean;
  block_keyboard_shortcuts: boolean;
  auto_submit_on_violation: boolean;
}

export interface ProctorViolation {
  type: ViolationType;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export type ViolationType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'right_click'
  | 'keyboard_shortcut'
  | 'copy_attempt'
  | 'paste_attempt';

export interface ProctorLog {
  id: string;
  quiz_attempt_id: string;
  student_id: string;
  quiz_id: string;
  violation_type: ViolationType;
  violation_details: Record<string, unknown>;
  violation_count: number;
  auto_submitted: boolean;
  created_at: string;
}

export interface ProctorState {
  isActive: boolean;
  isFullscreen: boolean;
  violationCount: number;
  violations: ProctorViolation[];
  showWarning: boolean;
  warningMessage: string;
  lastViolation: ProctorViolation | null;
}

export const DEFAULT_PROCTOR_SETTINGS: ProctorSettings = {
  max_violations: 3,
  fullscreen_required: true,
  block_right_click: true,
  block_keyboard_shortcuts: true,
  auto_submit_on_violation: true,
};
