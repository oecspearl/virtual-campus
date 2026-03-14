// ─── Shared helpers for course detail components ────────────────────────────

export const formatModality = (modality?: string): string => {
  switch (modality) {
    case 'self_paced': return 'Self-paced';
    case 'blended': return 'Blended';
    case 'instructor_led': return 'Instructor-led';
    default: return 'Self-paced';
  }
};

export const getModalityIcon = (modality?: string): string => {
  switch (modality) {
    case 'self_paced': return '📖';
    case 'blended': return '🔄';
    case 'instructor_led': return '👨‍🏫';
    default: return '📖';
  }
};

export const getContentTypeIcon = (type: string): string => {
  switch (type) {
    case 'video': return 'material-symbols:play-circle';
    case 'audio': return 'material-symbols:headphones';
    case 'document': return 'material-symbols:description';
    case 'pdf': return 'material-symbols:picture-as-pdf';
    case 'scorm': return 'material-symbols:package-2';
    case 'quiz': return 'material-symbols:quiz';
    default: return 'material-symbols:article';
  }
};

export const getLinkTypeIcon = (linkType: string): string => {
  switch (linkType) {
    case 'video': return 'material-symbols:play-circle';
    case 'document': return 'material-symbols:description';
    case 'download': return 'material-symbols:download';
    case 'reference': return 'material-symbols:bookmark';
    default: return 'material-symbols:link';
  }
};

export const formatDuration = (seconds: number | null): string => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
};

export const STAFF_ROLES = ['instructor', 'curriculum_designer', 'admin', 'super_admin', 'tenant_admin'] as const;

export const isStaffRole = (role: string | null): boolean => {
  if (!role) return false;
  return (STAFF_ROLES as readonly string[]).includes(role);
};
