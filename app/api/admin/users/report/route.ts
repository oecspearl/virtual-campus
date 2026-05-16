import { NextRequest, NextResponse } from "next/server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';
import { boundDateRange } from '@/lib/date-range';
import { streamCsvResponse } from '@/lib/csv-stream';

const REPORT_MAX_DAYS = 365 * 2; // 2 years — admin reports legitimately span longer than analytics dashboards
const REPORT_DEFAULT_DAYS = 365;

// Page size for paginated user fetch + enrollment IN-clause. Tuned for
// the 10k-student case: 500 keeps memory at ~5 MB per batch, the IN
// clause stays well under Postgres limits, and we emit rows roughly
// every 200ms so the client sees download progress.
const USER_PAGE_SIZE = 500;

// Field catalog — defines which selectable fields the UI sends and
// how each one is sourced and labelled. Kept module-level so the
// header row and the per-row formatter share the same definition.
const FIELD_DEFINITIONS: Record<
  string,
  { source: 'users' | 'profiles' | 'enrollments' | 'auth'; field: string; label: string }
> = {
  // Basic user fields
  id: { source: 'users', field: 'id', label: 'User ID' },
  email: { source: 'users', field: 'email', label: 'Email' },
  name: { source: 'users', field: 'name', label: 'Name' },
  role: { source: 'users', field: 'role', label: 'Role' },
  gender: { source: 'users', field: 'gender', label: 'Gender' },
  created_at: { source: 'users', field: 'created_at', label: 'Created Date' },
  updated_at: { source: 'users', field: 'updated_at', label: 'Last Updated' },

  // Profile fields
  bio: { source: 'profiles', field: 'bio', label: 'Biography' },
  avatar: { source: 'profiles', field: 'avatar', label: 'Avatar URL' },

  // Learning preferences (from profiles)
  grade_level: { source: 'profiles', field: 'learning_preferences->grade_level', label: 'Grade Level' },
  subject_areas: { source: 'profiles', field: 'learning_preferences->subject_interests', label: 'Subject Areas' },
  learning_style: { source: 'profiles', field: 'learning_preferences->learning_style', label: 'Learning Style' },
  difficulty_preference: { source: 'profiles', field: 'learning_preferences->difficulty_preference', label: 'Difficulty Preference' },

  // Enrollment statistics
  enrollment_count: { source: 'enrollments', field: 'count', label: 'Course Enrollments' },
  active_enrollments: { source: 'enrollments', field: 'active_count', label: 'Active Enrollments' },
  completed_enrollments: { source: 'enrollments', field: 'completed_count', label: 'Completed Enrollments' },

  // Course information (if enrolled)
  enrolled_courses: { source: 'enrollments', field: 'course_titles', label: 'Enrolled Courses' },

  // Activity statistics
  last_login: { source: 'auth', field: 'last_sign_in_at', label: 'Last Login' },
  login_count: { source: 'auth', field: 'sign_in_count', label: 'Login Count' },
};

interface EnrollmentStats {
  total: number;
  active: number;
  completed: number;
  courses: string[];
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const body = await request.json();
    const { fields = [], filters = {} } = body;

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: 'No fields selected for export' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    const range = boundDateRange(
      filters.created_after || null,
      filters.created_before || null,
      { defaultDays: REPORT_DEFAULT_DAYS, maxDays: REPORT_MAX_DAYS },
    );

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `user-report-${timestamp}.csv`;

    // Stream the CSV. Each batch of USER_PAGE_SIZE users is fetched +
    // enriched + emitted before the next batch begins, so memory stays
    // bounded regardless of total user count.
    return streamCsvResponse({
      filename,
      async produce(write) {
        // Header row
        write(fields.map((f: string) => FIELD_DEFINITIONS[f]?.label || f));

        let offset = 0;
        while (true) {
          const userQuery = tq
            .from('users')
            .select(
              'id, email, name, role, gender, created_at, updated_at, user_profiles!left (bio, avatar, learning_preferences)',
            )
            .gte('created_at', range.startIso)
            .lte('created_at', range.endIso)
            .order('created_at', { ascending: false })
            .range(offset, offset + USER_PAGE_SIZE - 1);

          // Apply role / gender filters inside the loop so paging stays correct.
          let scopedQuery = userQuery;
          if (filters.role && filters.role.length > 0) {
            scopedQuery = scopedQuery.in('role', filters.role);
          }
          if (filters.gender && filters.gender.length > 0) {
            scopedQuery = scopedQuery.in('gender', filters.gender);
          }

          const { data: users, error: usersError } = await scopedQuery;
          if (usersError) {
            throw new Error(`Failed to fetch users: ${usersError.message}`);
          }
          if (!users || users.length === 0) break;

          // Only fetch enrollments if at least one selected field needs them.
          const needsEnrollments = fields.some(
            (f: string) => FIELD_DEFINITIONS[f]?.source === 'enrollments',
          );
          const enrollmentStats: Record<string, EnrollmentStats> = {};

          if (needsEnrollments) {
            const userIds = users.map((u: { id: string }) => u.id);
            const { data: enrollments } = await tq
              .from('enrollments')
              .select('student_id, status, course_id, courses!inner (title)')
              .in('student_id', userIds);

            for (const enrollment of enrollments ?? []) {
              const sid = (enrollment as { student_id: string }).student_id;
              const stats = enrollmentStats[sid] ?? {
                total: 0,
                active: 0,
                completed: 0,
                courses: [],
              };
              stats.total++;
              if ((enrollment as { status?: string }).status === 'active') stats.active++;
              if ((enrollment as { status?: string }).status === 'completed') stats.completed++;
              const title = (enrollment as { courses?: { title?: string } }).courses?.title;
              if (title) stats.courses.push(title);
              enrollmentStats[sid] = stats;
            }
          }

          for (const user of users) {
            write(fields.map((f: string) => formatField(f, user, enrollmentStats)));
          }

          if (users.length < USER_PAGE_SIZE) break;
          offset += USER_PAGE_SIZE;
        }
      },
    });
  } catch (error) {
    console.error('User report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

function formatField(
  field: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any,
  enrollmentStats: Record<string, EnrollmentStats>,
): string {
  const fieldDef = FIELD_DEFINITIONS[field];
  if (!fieldDef) return '';

  let value: unknown = '';

  switch (fieldDef.source) {
    case 'users':
      value = user[fieldDef.field] ?? '';
      break;

    case 'profiles':
      if (fieldDef.field.startsWith('learning_preferences->')) {
        const prefKey = fieldDef.field.replace('learning_preferences->', '');
        value = user.user_profiles?.learning_preferences?.[prefKey] ?? '';
      } else {
        value = user.user_profiles?.[fieldDef.field] ?? '';
      }
      break;

    case 'enrollments': {
      const stats = enrollmentStats[user.id] ?? { total: 0, active: 0, completed: 0, courses: [] };
      switch (fieldDef.field) {
        case 'count': value = stats.total; break;
        case 'active_count': value = stats.active; break;
        case 'completed_count': value = stats.completed; break;
        case 'course_titles': value = stats.courses.join('; '); break;
      }
      break;
    }

    case 'auth':
      // Auth data would require a separate Supabase Auth Admin API call
      // per user; not enabled here yet. Returns empty for now.
      value = '';
      break;
  }

  if (value === null || value === undefined) return '';

  // Format dates in a human-friendly form. streamCsvResponse handles
  // CSV-cell escaping; we just return the unescaped string here.
  if (fieldDef.field === 'created_at' || fieldDef.field === 'updated_at') {
    if (value) {
      try {
        return new Date(String(value)).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    return '';
  }

  return String(value);
}
