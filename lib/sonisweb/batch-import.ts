import { createTenantQuery } from '@/lib/tenant-query';
import { generateReadableCode } from '@/lib/crypto-random';

// Flat JSON types sent from the client (parsed from XML in the browser)
export interface PersonRecord {
  sourceId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface GroupRecord {
  sourceId: string;
  shortDesc: string;
  longDesc: string;
  semester: string;
}

export interface MembershipRecord {
  groupSourceId: string;
  personSourceId: string;
  roleType: string; // "01" = student, "02" = instructor
  status: string;   // "1" = active
}

export interface BatchResult {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
  idMap?: Record<string, string>; // sourceId -> DB UUID (for persons and groups)
  instructors_assigned?: number;
}

// Parse the IMS Enterprise XML course description into code, section, campus, and title
function parseCourseDescription(desc: string): { code: string; section: string; campus: string; title: string } {
  const match = desc.match(/^([^:]+):([^:]+):(\S+)\s+(.+)$/);
  if (match) {
    return { code: match[1], section: match[2], campus: match[3], title: match[4] };
  }
  return { code: desc, section: '', campus: '', title: desc };
}

function generateTempPassword(): string {
  return generateReadableCode(12, { includeSpecial: true });
}

export async function importPersonsBatch(
  batch: PersonRecord[],
  tenantId: string,
  options: { defaultStudentRole?: string }
): Promise<BatchResult> {
  const result: BatchResult = { created: 0, skipped: 0, failed: 0, errors: [], idMap: {} };
  const { defaultStudentRole = 'student' } = options;
  const tq = createTenantQuery(tenantId);

  for (const person of batch) {
    try {
      if (!person.sourceId || !person.email) {
        result.skipped++;
        continue;
      }

      // Check if user already exists by email
      const { data: existingUser } = await tq.from('users')
        .select('id')
        .eq('email', person.email.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        // Backfill student_id if missing
        await tq.from('users')
          .update({ student_id: person.sourceId, updated_at: new Date().toISOString() })
          .eq('id', existingUser.id)
          .is('student_id', null);
        result.idMap![person.sourceId] = existingUser.id;
        result.skipped++;
        continue;
      }

      // Create auth user
      const tempPassword = generateTempPassword();
      const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
        email: person.email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: person.name, role: defaultStudentRole },
      });

      if (authError || !authData?.user) {
        if (authError?.message?.includes('already been registered')) {
          const { data: { users: authUsers } } = await tq.raw.auth.admin.listUsers();
          const existingAuth = authUsers?.find((u: { email?: string }) => u.email === person.email.toLowerCase());
          if (existingAuth) {
            await tq.from('users').upsert({
              id: existingAuth.id,
              email: person.email.toLowerCase(),
              name: person.name,
              role: defaultStudentRole,
              student_id: person.sourceId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' });

            await tq.from('user_profiles').upsert({
              user_id: existingAuth.id,
              bio: '',
              avatar: null,
              learning_preferences: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

            await tq.from('tenant_memberships').upsert({
              tenant_id: tenantId,
              user_id: existingAuth.id,
              role: defaultStudentRole,
              is_primary: true,
            }, { onConflict: 'tenant_id,user_id' });

            result.idMap![person.sourceId] = existingAuth.id;
            result.created++;
            continue;
          }
        }
        result.failed++;
        result.errors.push(`${person.sourceId} (${person.email}): ${authError?.message || 'Auth creation failed'}`);
        continue;
      }

      const userId = authData.user.id;

      const { error: userError } = await tq.from('users').insert({
        id: userId,
        email: person.email.toLowerCase(),
        name: person.name,
        role: defaultStudentRole,
        student_id: person.sourceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (userError) {
        await tq.raw.auth.admin.deleteUser(userId);
        result.failed++;
        result.errors.push(`${person.sourceId}: DB insert failed - ${userError.message}`);
        continue;
      }

      await tq.from('user_profiles').insert({
        user_id: userId,
        bio: '',
        avatar: null,
        learning_preferences: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await tq.from('tenant_memberships').insert({
        tenant_id: tenantId,
        user_id: userId,
        role: defaultStudentRole,
        is_primary: true,
      });

      result.idMap![person.sourceId] = userId;
      result.created++;
    } catch (err) {
      result.failed++;
      result.errors.push(`${person.sourceId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

export async function importGroupsBatch(
  batch: GroupRecord[],
  tenantId: string,
  options: { publishCourses?: boolean; defaultModality?: string }
): Promise<BatchResult> {
  const result: BatchResult = { created: 0, skipped: 0, failed: 0, errors: [], idMap: {} };
  const { publishCourses = false, defaultModality = 'online' } = options;
  const tq = createTenantQuery(tenantId);

  for (const group of batch) {
    try {
      if (!group.sourceId || !group.shortDesc) {
        result.skipped++;
        continue;
      }

      const parsed = parseCourseDescription(group.shortDesc);
      const courseTitle = `${parsed.code} - ${parsed.title}`;

      const { data: existingCourse } = await tq.from('courses')
        .select('id')
        .eq('title', courseTitle)
        .maybeSingle();

      if (existingCourse) {
        result.idMap![group.sourceId] = existingCourse.id;
        result.skipped++;
        continue;
      }

      const { data: newCourse, error: courseError } = await tq.from('courses')
        .insert({
          title: courseTitle,
          description: group.longDesc !== group.shortDesc
            ? group.longDesc
            : `${parsed.title} (Section ${parsed.section}, ${parsed.campus})${group.semester ? ` - ${group.semester}` : ''}`,
          published: publishCourses,
          modality: defaultModality,
          subject_area: parsed.code.replace(/\d+/g, '').trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (courseError || !newCourse) {
        result.failed++;
        result.errors.push(`${group.shortDesc}: ${courseError?.message || 'Insert failed'}`);
        continue;
      }

      result.idMap![group.sourceId] = newCourse.id;
      result.created++;
    } catch (err) {
      result.failed++;
      result.errors.push(`${group.sourceId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

export async function importMembershipsBatch(
  batch: MembershipRecord[],
  tenantId: string,
  personIdMap: Record<string, string>,
  groupIdMap: Record<string, string>,
  options: { defaultInstructorRole?: string }
): Promise<BatchResult> {
  const result: BatchResult = { created: 0, skipped: 0, failed: 0, errors: [], instructors_assigned: 0 };
  const { defaultInstructorRole = 'instructor' } = options;
  const tq = createTenantQuery(tenantId);

  for (const membership of batch) {
    try {
      if (!membership.groupSourceId || !membership.personSourceId) {
        result.skipped++;
        continue;
      }

      if (membership.status !== '1') {
        result.skipped++;
        continue;
      }

      const courseId = groupIdMap[membership.groupSourceId];
      const userId = personIdMap[membership.personSourceId];

      if (!courseId || !userId) {
        result.skipped++;
        continue;
      }

      const isInstructor = membership.roleType === '02';

      if (isInstructor) {
        const { data: userRecord } = await tq.from('users')
          .select('role')
          .eq('id', userId)
          .single();

        if (userRecord && userRecord.role === 'student') {
          await tq.from('users')
            .update({ role: defaultInstructorRole, updated_at: new Date().toISOString() })
            .eq('id', userId);

          await tq.from('tenant_memberships')
            .update({ role: defaultInstructorRole })
            .eq('user_id', userId)
            .eq('tenant_id', tenantId);
        }

        const { error: instrError } = await tq.from('course_instructors')
          .upsert({
            course_id: courseId,
            instructor_id: userId,
          }, { onConflict: 'course_id,instructor_id' });

        if (!instrError) {
          result.instructors_assigned = (result.instructors_assigned || 0) + 1;
        }
      } else {
        const { data: studentData } = await tq.from('users')
          .select('name, email, role, created_at')
          .eq('id', userId)
          .single();

        const { data: profileData } = await tq.from('user_profiles')
          .select('bio, avatar, learning_preferences, created_at')
          .eq('user_id', userId)
          .maybeSingle();

        const { error: enrollError } = await tq.from('course_enrollments')
          .upsert({
            student_id: userId,
            course_id: courseId,
            status: 'active',
            enrolled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            student_name: studentData?.name || null,
            student_email: studentData?.email || null,
            student_role: studentData?.role || 'student',
            student_bio: profileData?.bio || null,
            student_avatar: profileData?.avatar || null,
            learning_preferences: profileData?.learning_preferences || {},
            user_created_at: studentData?.created_at || null,
            profile_created_at: profileData?.created_at || null,
          }, { onConflict: 'student_id,course_id' });

        if (enrollError) {
          result.failed++;
          result.errors.push(`${membership.personSourceId}->${membership.groupSourceId}: ${enrollError.message}`);
        } else {
          result.created++;
        }
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`Membership: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}
