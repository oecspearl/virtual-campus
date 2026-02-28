export interface VideoConference {
  id: string;
  title: string;
  description?: string;
  course_id: string;
  lesson_id?: string;
  instructor_id: string;
  meeting_id: string;
  meeting_url: string;
  meeting_password?: string;
  video_provider?: '8x8vc' | 'google_meet' | 'bigbluebutton';
  google_meet_link?: string;
  bbb_attendee_pw?: string;
  bbb_moderator_pw?: string;
  scheduled_at?: string;
  timezone?: string;
  duration_minutes: number;
  max_participants: number;
  recording_enabled: boolean;
  waiting_room_enabled: boolean;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_at: string;
  updated_at: string;
  instructor?: any;
  course?: any;
  lesson?: any;
  participants?: ConferenceParticipant[];
}

export interface ConferenceParticipant {
  id: string;
  conference_id: string;
  user_id: string;
  joined_at?: string;
  left_at?: string;
  role: 'host' | 'co-host' | 'participant';
  user?: any;
}

export interface ConferenceRecording {
  id: string;
  conference_id: string;
  recording_url: string;
  recording_duration?: number;
  file_size?: number;
  created_at: string;
}

