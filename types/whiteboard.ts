export interface Whiteboard {
  id: string;
  tenant_id: string;
  created_by: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  elements: any[];
  app_state: Record<string, any>;
  frames: WhiteboardFrame[];
  visibility: 'private' | 'course' | 'shared' | 'public';
  course_id?: string;
  lesson_id?: string;
  collaboration: 'view_only' | 'comment_only' | 'collaborate';
  is_template: boolean;
  auto_snapshot: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  creator?: { id: string; name: string; email: string; avatar_url?: string };
  course?: { id: string; title: string };
  version_count?: number;
}

export interface WhiteboardFrame {
  id: string;
  label: string;
}

export interface WhiteboardVersion {
  id: string;
  whiteboard_id: string;
  saved_by: string;
  label?: string;
  elements: any[];
  app_state?: Record<string, any>;
  frames?: WhiteboardFrame[];
  thumbnail_url?: string;
  created_at: string;
  // Joined
  saver?: { id: string; name: string };
}

export interface ConferenceWhiteboard {
  id: string;
  tenant_id: string;
  conference_id: string;
  whiteboard_id: string;
  added_by: string;
  collaboration: 'view_only' | 'comment_only' | 'collaborate';
  available_from: 'on_join' | 'on_activate' | 'after_session';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  // Joined
  whiteboard?: Whiteboard;
}
