import { parseStringPromise } from 'xml2js';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import { createTenantQuery } from '@/lib/tenant-query';
import { generateReadableCode } from '@/lib/crypto-random';

// IMS Enterprise XML types
interface IMSPerson {
  sourcedid: [{ id: [string]; source?: [string] }];
  userid?: [string];
  name: [{ fn: [string]; n?: [{ family?: [string]; given?: [string]; suffix?: [string] }] }];
  email?: [string];
}

interface IMSGroup {
  sourcedid: [{ id: [string]; source?: [string] }];
  description?: [{ short?: [string]; long?: [string] }];
  org?: [{ orgunit?: [string] }];
}

interface IMSMembership {
  sourcedid: [{ id: [string]; source?: [string] }];
  member: [{
    sourcedid: [{ id: [string]; source?: [string] }];
    idtype?: [string];
    role: [{ $?: { roletype?: string }; status?: [string] }];
  }];
}

interface IMSEnterprise {
  enterprise: {
    properties?: [{ datasource?: [string]; datetime?: [string] }];
    person?: IMSPerson[];
    group?: IMSGroup[];
    membership?: IMSMembership[];
  };
}

export interface XMLImportResult {
  status: 'success' | 'partial' | 'failed';
  persons_processed: number;
  persons_created: number;
  persons_skipped: number;
  persons_failed: number;
  groups_processed: number;
  courses_created: number;
  courses_skipped: number;
  courses_failed: number;
  memberships_processed: number;
  enrollments_created: number;
  enrollments_skipped: number;
  enrollments_failed: number;
  instructors_assigned: number;
  errors: string[];
  datasource?: string;
}

// Parse the IMS Enterprise XML course description into code, section, campus, and title
function parseCourseDescription(desc: string): { code: string; section: string; campus: string; title: string } {
  // Format: "ACC113:A:MAIN Principles of Financial Accounting I"
  const match = desc.match(/^([^:]+):([^:]+):(\S+)\s+(.+)$/);
  if (match) {
    return { code: match[1], section: match[2], campus: match[3], title: match[4] };
  }
  return { code: desc, section: '', campus: '', title: desc };
}

function generateTempPassword(): string {
  return generateReadableCode(12, { includeSpecial: true });
}

export async function importIMSEnterpriseXML(
  xmlContent: string,
  tenantId: string,
  options: {
    createUsers?: boolean;
    createCourses?: boolean;
    createEnrollments?: boolean;
    defaultStudentRole?: string;
    defaultInstructorRole?: string;
    authFlow?: 'welcome_email' | 'sso_passthrough';
    publishCourses?: boolean;
    defaultModality?: string;
    semester?: string;
  } = {}
): Promise<XMLImportResult> {
  const {
    createUsers = true,
    createCourses = true,
    createEnrollments = true,
    defaultStudentRole = 'student',
    defaultInstructorRole = 'instructor',
    authFlow = 'welcome_email',
    publishCourses = false,
    defaultModality = 'online',
  } = options;

  const result: XMLImportResult = {
    status: 'success',
    persons_processed: 0,
    persons_created: 0,
    persons_skipped: 0,
    persons_failed: 0,
    groups_processed: 0,
    courses_created: 0,
    courses_skipped: 0,
    courses_failed: 0,
    memberships_processed: 0,
    enrollments_created: 0,
    enrollments_skipped: 0,
    enrollments_failed: 0,
    instructors_assigned: 0,
    errors: [],
  };

  // Parse XML
  let parsed: IMSEnterprise;
  try {
    parsed = await parseStringPromise(xmlContent, {
      explicitArray: true,
      trim: true,
      normalizeTags: false,
    });
  } catch (err) {
    result.status = 'failed';
    result.errors.push(`XML parse error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  const enterprise = parsed.enterprise;
  if (!enterprise) {
    result.status = 'failed';
    result.errors.push('Invalid XML: missing <enterprise> root element');
    return result;
  }

  result.datasource = enterprise.properties?.[0]?.datasource?.[0] || 'Unknown';

  const persons = enterprise.person || [];
  const groups = enterprise.group || [];
  const memberships = enterprise.membership || [];

  const tq = createTenantQuery(tenantId);

  // Maps for cross-referencing: sourceId -> LMS UUID
  const personIdMap = new Map<string, string>(); // sonis person ID -> LMS user ID
  const groupIdMap = new Map<string, string>();   // sonis group ID -> LMS course ID

  // ── Phase 1: Import Persons ──
  if (createUsers && persons.length > 0) {
    for (const person of persons) {
      result.persons_processed++;
      try {
        const sourceId = person.sourcedid?.[0]?.id?.[0];
        const fullName = person.name?.[0]?.fn?.[0];
        const email = person.email?.[0];
        const firstName = person.name?.[0]?.n?.[0]?.given?.[0] || '';
        const lastName = person.name?.[0]?.n?.[0]?.family?.[0] || '';
        const name = fullName || `${firstName} ${lastName}`.trim();

        if (!sourceId || !email) {
          result.persons_skipped++;
          continue;
        }

        // Check if user already exists by email
        const { data: existingUser } = await tq.from('users')
          .select('id')
          .eq('email', email.toLowerCase())
          .maybeSingle();

        if (existingUser) {
          personIdMap.set(sourceId, existingUser.id);
          result.persons_skipped++;
          continue;
        }

        // Create auth user
        const tempPassword = generateTempPassword();
        const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: name, role: defaultStudentRole },
        });

        if (authError || !authData?.user) {
          // May already exist in auth but not in users table
          if (authError?.message?.includes('already been registered')) {
            const { data: { users: authUsers } } = await tq.raw.auth.admin.listUsers();
            const existingAuth = authUsers?.find((u: { email?: string }) => u.email === email.toLowerCase());
            if (existingAuth) {
              // Create the users table record for existing auth user
              await tq.from('users').upsert({
                id: existingAuth.id,
                email: email.toLowerCase(),
                name,
                role: defaultStudentRole,
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

              personIdMap.set(sourceId, existingAuth.id);
              result.persons_created++;
              continue;
            }
          }
          result.persons_failed++;
          result.errors.push(`Person ${sourceId} (${email}): ${authError?.message || 'Auth creation failed'}`);
          continue;
        }

        const userId = authData.user.id;

        // Create users table record
        const { error: userError } = await tq.from('users').insert({
          id: userId,
          email: email.toLowerCase(),
          name,
          role: defaultStudentRole,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (userError) {
          // Rollback auth user
          await tq.raw.auth.admin.deleteUser(userId);
          result.persons_failed++;
          result.errors.push(`Person ${sourceId}: DB insert failed - ${userError.message}`);
          continue;
        }

        // Create user profile
        await tq.from('user_profiles').insert({
          user_id: userId,
          bio: '',
          avatar: null,
          learning_preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // Create tenant membership
        await tq.from('tenant_memberships').insert({
          tenant_id: tenantId,
          user_id: userId,
          role: defaultStudentRole,
          is_primary: true,
        });

        personIdMap.set(sourceId, userId);
        result.persons_created++;

      } catch (err) {
        result.persons_failed++;
        result.errors.push(`Person error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ── Phase 2: Import Groups (Courses) ──
  if (createCourses && groups.length > 0) {
    for (const group of groups) {
      result.groups_processed++;
      try {
        const groupSourceId = group.sourcedid?.[0]?.id?.[0];
        const shortDesc = group.description?.[0]?.short?.[0] || '';
        const longDesc = group.description?.[0]?.long?.[0] || shortDesc;
        const semester = group.org?.[0]?.orgunit?.[0] || options.semester || '';

        if (!groupSourceId || !shortDesc) {
          result.courses_skipped++;
          continue;
        }

        const parsed = parseCourseDescription(shortDesc);
        const courseTitle = `${parsed.code} - ${parsed.title}`;

        // Check if course already exists with same title
        const { data: existingCourse } = await tq.from('courses')
          .select('id')
          .eq('title', courseTitle)
          .maybeSingle();

        if (existingCourse) {
          groupIdMap.set(groupSourceId, existingCourse.id);
          result.courses_skipped++;
          continue;
        }

        // Create course
        const { data: newCourse, error: courseError } = await tq.from('courses')
          .insert({
            title: courseTitle,
            description: longDesc !== shortDesc ? longDesc : `${parsed.title} (Section ${parsed.section}, ${parsed.campus})${semester ? ` - ${semester}` : ''}`,
            published: publishCourses,
            modality: defaultModality,
            subject_area: parsed.code.replace(/\d+/g, '').trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (courseError || !newCourse) {
          result.courses_failed++;
          result.errors.push(`Course ${shortDesc}: ${courseError?.message || 'Insert failed'}`);
          continue;
        }

        groupIdMap.set(groupSourceId, newCourse.id);
        result.courses_created++;

      } catch (err) {
        result.courses_failed++;
        result.errors.push(`Course error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // ── Phase 3: Import Memberships (Enrollments) ──
  if (createEnrollments && memberships.length > 0) {
    for (const membership of memberships) {
      result.memberships_processed++;
      try {
        const groupSourceId = membership.sourcedid?.[0]?.id?.[0];
        const member = membership.member?.[0];
        const personSourceId = member?.sourcedid?.[0]?.id?.[0];
        const roleType = member?.role?.[0]?.$?.roletype;
        const status = member?.role?.[0]?.status?.[0];

        if (!groupSourceId || !personSourceId) {
          result.enrollments_skipped++;
          continue;
        }

        // Only process active memberships
        if (status !== '1') {
          result.enrollments_skipped++;
          continue;
        }

        const courseId = groupIdMap.get(groupSourceId);
        const userId = personIdMap.get(personSourceId);

        if (!courseId || !userId) {
          result.enrollments_skipped++;
          continue;
        }

        const isInstructor = roleType === '02';

        if (isInstructor) {
          // Assign as course instructor
          // First, update the user's role to instructor if they were imported as student
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

          // Add to course_instructors
          const { error: instrError } = await tq.from('course_instructors')
            .upsert({
              course_id: courseId,
              instructor_id: userId,
            }, { onConflict: 'course_id,instructor_id' });

          if (!instrError) {
            result.instructors_assigned++;
          }
        } else {
          // Enroll as student
          // Fetch student data for denormalization
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
            result.enrollments_failed++;
            result.errors.push(`Enrollment ${personSourceId}->${groupSourceId}: ${enrollError.message}`);
          } else {
            result.enrollments_created++;
          }
        }

      } catch (err) {
        result.enrollments_failed++;
        result.errors.push(`Membership error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Determine overall status
  const totalFailed = result.persons_failed + result.courses_failed + result.enrollments_failed;
  const totalProcessed = result.persons_processed + result.groups_processed + result.memberships_processed;

  if (totalFailed === 0) {
    result.status = 'success';
  } else if (totalFailed < totalProcessed) {
    result.status = 'partial';
  } else {
    result.status = 'failed';
  }

  // Cap errors array to prevent huge responses
  if (result.errors.length > 50) {
    const totalErrors = result.errors.length;
    result.errors = result.errors.slice(0, 50);
    result.errors.push(`... and ${totalErrors - 50} more errors`);
  }

  return result;
}
