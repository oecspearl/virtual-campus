import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const { userProfile } = authResult;

    // Check if user has admin privileges
    if (!hasRole(userProfile.role, ['admin', 'super_admin'])) {
      return createAuthResponse("Forbidden: Admin access required", 403);
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Handle file upload
    const formData = await request.formData();
    const file = formData.get('csv') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('csv') && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Read file content
    const csvContent = await file.text();
    return await handleCsvImport(csvContent, tq);
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}

async function handleCsvImport(csvContent: string, tq: any) {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 });
    }

    // Use the same parseCsvLine function for headers to handle quotes properly
    const headers = parseCsvLine(lines[0].trim()).map(h => h.trim().toLowerCase());
    const dataLines = lines.slice(1);

    console.log('CSV Headers:', headers);

    // Validate headers
    const requiredHeaders = ['email', 'name', 'role'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h.toLowerCase()));
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required headers: ${missingHeaders.join(', ')}` 
      }, { status: 400 });
    }

    const results = [];
    const validationErrors = [];

    // Parse and validate each row
    let actualRowNumber = 1; // Track actual data rows (excluding empty rows)
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) {
        console.log(`Skipping empty line at position ${i + 2}`);
        continue; // Skip empty lines
      }

      try {
        const values = parseCsvLine(line);
        
        // Log every 10th row and row 38 specifically
        if ((i + 2) === 38 || (i + 2) % 10 === 0) {
          console.log(`Processing CSV line ${i + 2}, actualRowNumber=${actualRowNumber}, values count=${values.length}`);
        }
        
        // Check if row has the correct number of values
        if (values.length !== headers.length) {
          console.warn(`Row ${i + 2} has ${values.length} values but headers has ${headers.length} columns`);
          // Try to proceed anyway if we have at least the minimum fields
          if (values.length < 3) {
            console.error(`Row ${i + 2} has insufficient columns. Skipping.`);
            continue;
          }
        }
        
        // Get column indices
        const emailIdx = headers.indexOf('email');
        const nameIdx = headers.indexOf('name');
        const roleIdx = headers.indexOf('role');
        
        // Check if required columns exist
        if (emailIdx === -1 || nameIdx === -1 || roleIdx === -1) {
          console.error(`Missing required columns. Found headers: ${JSON.stringify(headers)}`);
          continue;
        }
        
        // Debug logging for problematic rows
        console.log(`Row ${i + 2}: values=${JSON.stringify(values)}, headers=${JSON.stringify(headers)}`);
        console.log(`Column indices - email: ${emailIdx}, name: ${nameIdx}, role: ${roleIdx}`);
        
        // Clean and normalize values
        const cleanValue = (val: string) => {
          if (!val) return '';
          return val
            .replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '') // Remove zero-width and special characters
            .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
            .trim();
        };
        
        const userData = {
          email: cleanValue(values[emailIdx] || ''),
          name: cleanValue(values[nameIdx] || ''),
          role: cleanValue(values[roleIdx] || 'student'),
          gender: cleanValue(values[headers.indexOf('gender')] || ''),
          password: cleanValue(values[headers.indexOf('password')] || ''),
          course_ids: cleanValue(values[headers.indexOf('course_ids')] || ''),
          grade_level: cleanValue(values[headers.indexOf('grade_level')] || ''),
          subject_areas: cleanValue(values[headers.indexOf('subject_areas')] || ''),
          learning_style: cleanValue(values[headers.indexOf('learning_style')] || ''),
          difficulty_preference: cleanValue(values[headers.indexOf('difficulty_preference')] || ''),
          bio: cleanValue(values[headers.indexOf('bio')] || ''),
          parent_email: cleanValue(values[headers.indexOf('parent_email')] || '')
        };
        
        // Only log parsed data for specific rows to reduce noise
        if ((i + 2) === 38 || (i + 2) % 10 === 0 || actualRowNumber === 1) {
          console.log(`Row ${i + 2} (actualRowNumber ${actualRowNumber}) parsed:`, userData);
        }

        // Validate user data - use i+2 (CSV line number) for reporting
        const errors = validateUserData(userData, i + 2);
        if (errors.length > 0) {
          console.error(`Validation errors for CSV line ${i + 2}:`, errors);
          validationErrors.push(...errors);
          results.push({ 
            email: userData.email, 
            name: userData.name,
            status: 'error', 
            error: errors.map(e => e.message).join('; ') 
          });
          continue;
        }

        // Create user
        const result = await createUserFromData(userData, tq);
        results.push(result);
        
        actualRowNumber++;

      } catch (error) {
        console.error(`Error processing row ${actualRowNumber}:`, error);
        results.push({ 
          email: 'unknown', 
          name: 'unknown',
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        actualRowNumber++;
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    return NextResponse.json({ 
      message: 'CSV import completed', 
      results,
      validationErrors,
      total: dataLines.length,
      successful,
      failed,
      hasValidationErrors: validationErrors.length > 0
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Failed to process CSV' }, { status: 500 });
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Handle escaped quotes (double quotes)
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Remove surrounding quotes if present
      const cleanedValue = current.trim().replace(/^"|"$/g, '');
      values.push(cleanedValue);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Remove surrounding quotes from last value
  const cleanedValue = current.trim().replace(/^"|"$/g, '');
  values.push(cleanedValue);
  return values;
}

function validateUserData(userData: any, rowNumber: number): Array<{row: number, field: string, message: string}> {
  const errors = [];
  
  // Email validation - check for empty string explicitly
  if (!userData.email || userData.email.trim() === '') {
    errors.push({ row: rowNumber, field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(userData.email.trim())) {
    errors.push({ row: rowNumber, field: 'email', message: 'Invalid email format' });
  }
  
  // Name validation - check for empty string explicitly
  if (!userData.name || userData.name.trim() === '') {
    errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
  }
  
  // Role validation
  const allowedRoles = ['super_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent'];
  const roleValue = (userData.role || '').trim();
  if (!roleValue) {
    errors.push({ row: rowNumber, field: 'role', message: 'Role is required' });
  } else if (!allowedRoles.includes(roleValue)) {
    errors.push({ row: rowNumber, field: 'role', message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
  }
  
  // Gender validation (optional but validate if provided)
  if (userData.gender && userData.gender.trim() !== '') {
    const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    const genderValue = userData.gender.trim();
    if (!allowedGenders.includes(genderValue)) {
      errors.push({ row: rowNumber, field: 'gender', message: `Invalid gender. Must be one of: ${allowedGenders.join(', ')}` });
    }
  }
  
  // Password validation (optional but validate if provided)
  if (userData.password && userData.password.trim() !== '') {
    const passwordValue = userData.password.trim();
    if (passwordValue.length < 8) {
      errors.push({ row: rowNumber, field: 'password', message: 'Password must be at least 8 characters long' });
    }
  }
  
  // Course IDs validation (optional but validate if provided)
  if (userData.course_ids && userData.course_ids.trim() !== '') {
    const courseIdsValue = userData.course_ids.trim();
    // Check if it's a valid UUID format or comma-separated UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const courseIds = courseIdsValue.split(',').map(id => id.trim());
    for (const courseId of courseIds) {
      if (courseId && !uuidRegex.test(courseId)) {
        errors.push({ row: rowNumber, field: 'course_ids', message: `Invalid course ID format: ${courseId}` });
        break;
      }
    }
  }
  
  return errors;
}

function isValidEmail(email: string): boolean {
  // Clean email of invisible/special characters
  const cleanedEmail = email.replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '').trim();
  
  // Log the exact characters for debugging
  if (!cleanedEmail || cleanedEmail.length === 0) {
    console.error('Email is empty after cleaning');
    return false;
  }
  
  // Check for non-printable characters
  if (/[^\x20-\x7E]/.test(cleanedEmail)) {
    console.error('Email contains non-printable characters:', JSON.stringify(cleanedEmail));
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(cleanedEmail);
  
  if (!isValid) {
    console.error('Invalid email format:', JSON.stringify(cleanedEmail));
    console.error('Character codes:', Array.from(cleanedEmail).map(c => c.charCodeAt(0)));
  }
  
  return isValid;
}

async function createUserFromData(userData: any, tq: any) {
  try {
    // Use provided password or generate temporary password
    const password = userData.password && userData.password.trim() !== '' 
      ? userData.password.trim() 
      : generateTempPassword();
    
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
      email: userData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.name
      }
    });

    if (authError) {
      return { 
        email: userData.email, 
        name: userData.name,
        status: 'error', 
        error: authError.message 
      };
    }

    // Create user in our database with gender field
    const { data: userRecord, error: userError } = await tq
      .from('users')
      .insert([{
        id: authData.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        gender: userData.gender && userData.gender.trim() !== '' ? userData.gender.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) {
      return { 
        email: userData.email, 
        name: userData.name,
        status: 'error', 
        error: userError.message 
      };
    }

    // Create user profile with additional data
    const learningPreferences: Record<string, string> = {};
    if (userData.learning_style) learningPreferences.learning_style = userData.learning_style;
    if (userData.difficulty_preference) learningPreferences.difficulty_preference = userData.difficulty_preference;
    if (userData.subject_areas) learningPreferences.subject_interests = userData.subject_areas;

    await tq
      .from('user_profiles')
      .insert([{
        user_id: authData.user.id,
        bio: userData.bio || '',
        avatar: null,
        learning_preferences: learningPreferences,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);

    // Handle course enrollments if course_ids are provided
    const enrollmentResults = [];
    if (userData.course_ids && userData.course_ids.trim() !== '') {
      const courseIds = userData.course_ids.split(',').map(id => id.trim()).filter(id => id);
      
      for (const courseId of courseIds) {
        try {
          // Check if course exists
          const { data: course, error: courseError } = await tq
            .from('courses')
            .select('id, title')
            .eq('id', courseId)
            .single();

          if (courseError || !course) {
            enrollmentResults.push({ courseId, status: 'error', error: 'Course not found' });
            continue;
          }

          // Check if user is already enrolled
          const { data: existingEnrollment } = await tq
            .from('enrollments')
            .select('id')
            .eq('course_id', courseId)
            .eq('student_id', authData.user.id)
            .maybeSingle();

          if (existingEnrollment) {
            enrollmentResults.push({ courseId, status: 'skipped', error: 'Already enrolled' });
            continue;
          }

          // Get student profile information for denormalization
          const { data: studentProfile } = await tq
            .from('user_profiles')
            .select('bio, avatar, learning_preferences, created_at')
            .eq('user_id', authData.user.id)
            .single();

          // Create enrollment with denormalized user information
          const enrollmentData = {
            course_id: courseId,
            student_id: authData.user.id,
            status: 'active',
            enrolled_at: new Date().toISOString(),
            student_name: userData.name,
            student_email: userData.email,
            student_role: userData.role,
            student_gender: userData.gender && userData.gender.trim() !== '' ? userData.gender.trim() : null,
            student_bio: studentProfile?.bio || null,
            student_avatar: studentProfile?.avatar || null,
            learning_preferences: studentProfile?.learning_preferences || {},
            user_created_at: userRecord.created_at,
            profile_created_at: studentProfile?.created_at || null
          };

          const { error: enrollmentError } = await tq
            .from('enrollments')
            .insert(enrollmentData);

          if (enrollmentError) {
            enrollmentResults.push({ courseId, status: 'error', error: enrollmentError.message });
          } else {
            enrollmentResults.push({ courseId, status: 'success', courseTitle: course.title });
          }

        } catch (enrollmentError) {
          enrollmentResults.push({ 
            courseId, 
            status: 'error', 
            error: enrollmentError instanceof Error ? enrollmentError.message : 'Unknown error' 
          });
        }
      }
    }

    return { 
      email: userData.email, 
      name: userData.name,
      status: 'success', 
      message: 'User created successfully',
      password: userData.password && userData.password.trim() !== '' ? 'Provided password used' : password,
      enrollments: enrollmentResults
    };

  } catch (error) {
    return { 
      email: userData.email, 
      name: userData.name,
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
