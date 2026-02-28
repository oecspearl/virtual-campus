// ============================================================================
// SonisWeb SIS Integration — TypeScript Types
// ============================================================================

// --- Connection ---

export interface SonisWebConnection {
  id: string;
  tenant_id: string;
  name: string;
  base_url: string;
  api_username: string;
  api_password_encrypted: string;
  api_mode: ApiMode;
  auth_flow: AuthFlow;
  sync_schedule: string;
  sync_enabled: boolean;
  student_sync_enabled: boolean;
  enrollment_sync_enabled: boolean;
  grade_passback_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: SyncStatus | null;
  connection_status: ConnectionStatus;
  settings: ConnectionSettings;
  created_at: string;
  updated_at: string;
}

export type ApiMode = 'soapapi' | 'soapsql' | 'both';
export type AuthFlow = 'welcome_email' | 'sso_passthrough';
export type ConnectionStatus = 'pending' | 'connected' | 'failed' | 'disabled';

export interface ConnectionSettings {
  timeout_ms?: number;
  batch_size?: number;
  retry_count?: number;
  default_student_role?: string;
  webhook_secret?: string;
  student_sql_query?: string;
  enrollment_sql_query?: string;
  course_sql_query?: string;
  programme_sql_query?: string;
}

// --- SOAP Client ---

export interface SoapApiRequest {
  user: string;
  pass: string;
  comp: string;
  meth: string;
  hasReturnVariable: 'yes' | 'no';
  argumentdata?: Array<{ name: string; value: string }>;
}

export interface SoapSqlRequest {
  user: string;
  pass: string;
  sql: string;
}

export interface SoapResponse {
  success: boolean;
  data: Record<string, any>[];
  columns?: string[];
  raw_xml?: string;
  error?: string;
}

// --- Field Mapping ---

export interface FieldMapping {
  id: string;
  tenant_id: string;
  connection_id: string;
  entity_type: EntityType;
  sonisweb_field: string;
  lms_field: string;
  lms_table?: string;
  transform_type: TransformType;
  transform_config: Record<string, any>;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type EntityType = 'student' | 'course' | 'programme' | 'enrollment' | 'grade';
export type TransformType = 'direct' | 'concat' | 'map' | 'format' | 'custom';

// --- ID Mapping ---

export interface IdMapping {
  id: string;
  tenant_id: string;
  connection_id: string;
  entity_type: IdMappingEntityType;
  sonisweb_id: string;
  lms_id: string;
  sonisweb_data: Record<string, any>;
  last_synced_at: string;
  sync_direction: SyncDirection;
  created_at: string;
  updated_at: string;
}

export type IdMappingEntityType = 'user' | 'course' | 'programme' | 'enrollment' | 'grade_item' | 'grade';
export type SyncDirection = 'pull' | 'push' | 'both';

// --- Sync Logs ---

export interface SyncLog {
  id: string;
  tenant_id: string;
  connection_id: string;
  sync_type: SyncType;
  trigger_type: TriggerType;
  status: SyncLogStatus;
  started_at: string;
  completed_at: string | null;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  error_details: SyncError[];
  summary: Record<string, any>;
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncType = 'students' | 'enrollments' | 'grades' | 'courses' | 'programmes' | 'full';
export type SyncStatus = 'success' | 'partial' | 'failed';
export type SyncLogStatus = 'running' | 'success' | 'partial' | 'failed';
export type TriggerType = 'manual' | 'cron' | 'webhook';

export interface SyncError {
  record_id: string;
  error: string;
  timestamp: string;
}

export interface SyncResult {
  log_id: string;
  status: SyncLogStatus;
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  errors: SyncError[];
}

// --- Grade Sync Config ---

export interface GradeSyncConfig {
  id: string;
  tenant_id: string;
  connection_id: string;
  course_id: string;
  enabled: boolean;
  sync_mode: GradeSyncMode;
  grade_format: GradeFormat;
  sonisweb_course_code: string | null;
  sonisweb_section: string | null;
  grade_items: GradeSyncItem[];
  last_passback_at: string | null;
  last_passback_status: SyncStatus | null;
  configured_by: string | null;
  created_at: string;
  updated_at: string;
}

export type GradeSyncMode = 'manual' | 'auto' | 'scheduled';
export type GradeFormat = 'percentage' | 'points' | 'letter';

export interface GradeSyncItem {
  grade_item_id: string;
  sonisweb_column: string;
  enabled: boolean;
}

// --- Webhook Events ---

export interface WebhookEvent {
  id: string;
  tenant_id: string;
  connection_id: string | null;
  event_type: string;
  payload: Record<string, any>;
  headers: Record<string, any>;
  status: WebhookStatus;
  processing_result: Record<string, any>;
  processed_at: string | null;
  error_message: string | null;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export type WebhookStatus = 'received' | 'processing' | 'processed' | 'failed' | 'ignored';

// --- SonisWeb Raw Data Types ---

export interface SonisWebStudent {
  soc_sec?: string;
  st_id?: string;
  nm_first: string;
  nm_last: string;
  nm_mid?: string;
  e_mail: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  gender?: string;
  birthdate?: string;
  [key: string]: any;
}

export interface SonisWebEnrollment {
  soc_sec?: string;
  st_id?: string;
  crs_id: string;
  crs_title?: string;
  section?: string;
  term?: string;
  semester?: string;
  school_year?: string;
  enroll_stat?: string;
  grade?: string;
  mid_grade?: string;
  credit_hrs?: string;
  [key: string]: any;
}

export interface SonisWebCourse {
  crs_id: string;
  crs_title: string;
  crs_desc?: string;
  credit_hrs?: string;
  department?: string;
  [key: string]: any;
}

export interface SonisWebProgramme {
  prg_cod: string;
  prg_desc: string;
  degree_type?: string;
  [key: string]: any;
}
