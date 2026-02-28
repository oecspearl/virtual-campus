import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from "@/lib/database-helpers";

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
    return await handleCsvBulkUpdate(csvContent, tq);
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}

async function handleCsvBulkUpdate(csvContent: string, tq: any) {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have at least a header and one data row' }, { status: 400 });
    }

    // Parse headers
    const headers = parseCsvLine(lines[0].trim()).map(h => h.trim().toLowerCase());
    const dataLines = lines.slice(1);

    console.log('CSV Headers:', headers);

    // Validate required header (email or id to identify user)
    if (!headers.includes('email') && !headers.includes('id')) {
      return NextResponse.json({ 
        error: 'CSV must include either "email" or "id" column to identify users' 
      }, { status: 400 });
    }

    const results = [];
    const validationErrors = [];

    // Parse and update each row
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) {
        console.log(`Skipping empty line at position ${i + 2}`);
        continue;
      }

      try {
        const values = parseCsvLine(line);
        
        // Clean and normalize values
        const cleanValue = (val: string) => {
          if (!val) return '';
          return val
            .replace(/[\u200B-\u200D\uFEFF\u2028\u2029]/g, '')
            .replace(/\u00A0/g, ' ')
            .trim();
        };
        
        // Build update data object
        const updateData: any = {};
        const userIdentifier: any = {};

        // Get user identifier (email or id)
        const emailIdx = headers.indexOf('email');
        const idIdx = headers.indexOf('id');
        
        if (emailIdx !== -1 && values[emailIdx]) {
          userIdentifier.email = cleanValue(values[emailIdx]);
        }
        if (idIdx !== -1 && values[idIdx]) {
          userIdentifier.id = cleanValue(values[idIdx]);
        }

        if (!userIdentifier.email && !userIdentifier.id) {
          results.push({ 
            row: i + 2,
            status: 'error', 
            error: 'No email or id provided' 
          });
          continue;
        }

        // Parse all possible update fields
        const fieldMappings = [
          { header: 'name', field: 'name' },
          { header: 'role', field: 'role' },
          { header: 'gender', field: 'gender' },
          { header: 'password', field: 'password' },
          { header: 'bio', field: 'bio' },
          { header: 'avatar', field: 'avatar' },
          { header: 'grade_level', field: 'grade_level' },
          { header: 'subject_areas', field: 'subject_areas' },
          { header: 'learning_style', field: 'learning_style' },
          { header: 'difficulty_preference', field: 'difficulty_preference' }
        ];

        for (const mapping of fieldMappings) {
          const idx = headers.indexOf(mapping.header);
          if (idx !== -1 && values[idx]) {
            const value = cleanValue(values[idx]);
            if (value) {
              updateData[mapping.field] = value;
            }
          }
        }

        // Validate update data
        const errors = validateUpdateData(updateData, i + 2);
        if (errors.length > 0) {
          console.error(`Validation errors for CSV line ${i + 2}:`, errors);
          validationErrors.push(...errors);
          results.push({ 
            row: i + 2,
            identifier: userIdentifier.email || userIdentifier.id,
            status: 'error', 
            error: errors.map(e => e.message).join('; ') 
          });
          continue;
        }

        // Update user
        const result = await updateUserFromData(userIdentifier, updateData, tq);
        results.push({ 
          row: i + 2,
          identifier: userIdentifier.email || userIdentifier.id,
          ...result 
        });

      } catch (error) {
        console.error(`Error processing row ${i + 2}:`, error);
        results.push({ 
          row: i + 2,
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    return NextResponse.json({ 
      message: 'CSV bulk update completed', 
      results,
      validationErrors,
      total: dataLines.length,
      successful,
      failed,
      hasValidationErrors: validationErrors.length > 0
    });

  } catch (error) {
    console.error('CSV bulk update error:', error);
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
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      const cleanedValue = current.trim().replace(/^"|"$/g, '');
      values.push(cleanedValue);
      current = '';
    } else {
      current += char;
    }
  }
  
  const cleanedValue = current.trim().replace(/^"|"$/g, '');
  values.push(cleanedValue);
  return values;
}

function validateUpdateData(updateData: any, rowNumber: number): Array<{row: number, field: string, message: string}> {
  const errors = [];
  
  // Role validation
  if (updateData.role) {
    const allowedRoles = ['super_admin', 'admin', 'instructor', 'curriculum_designer', 'student', 'parent'];
    if (!allowedRoles.includes(updateData.role)) {
      errors.push({ row: rowNumber, field: 'role', message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
    }
  }
  
  // Gender validation
  if (updateData.gender) {
    const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!allowedGenders.includes(updateData.gender)) {
      errors.push({ row: rowNumber, field: 'gender', message: `Invalid gender. Must be one of: ${allowedGenders.join(', ')}` });
    }
  }
  
  // Password validation
  if (updateData.password) {
    if (updateData.password.length < 8) {
      errors.push({ row: rowNumber, field: 'password', message: 'Password must be at least 8 characters long' });
    }
  }
  
  return errors;
}

async function updateUserFromData(userIdentifier: any, updateData: any, tq: any) {
  try {
    // Find user by email or id
    let query = tq.from('users').select('*');
    
    if (userIdentifier.id) {
      query = query.eq('id', userIdentifier.id);
    } else if (userIdentifier.email) {
      query = query.eq('email', userIdentifier.email);
    }
    
    const { data: existingUser, error: findError } = await query.maybeSingle();

    if (findError || !existingUser) {
      return { 
        status: 'error', 
        error: 'User not found' 
      };
    }

    const userId = existingUser.id;

    // Prepare user table updates
    const userUpdateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name) userUpdateData.name = updateData.name;
    if (updateData.role) userUpdateData.role = updateData.role;
    if (updateData.gender !== undefined) userUpdateData.gender = updateData.gender;

    // Update users table if there are changes
    if (Object.keys(userUpdateData).length > 1) {
      const { error: userError } = await tq
        .from('users')
        .update(userUpdateData)
        .eq('id', userId);

      if (userError) {
        return { 
          status: 'error', 
          error: userError.message 
        };
      }
    }

    // Update Supabase Auth if needed
    const authUpdateData: any = {};
    if (updateData.name) {
      authUpdateData.user_metadata = { full_name: updateData.name };
    }
    if (updateData.password) {
      authUpdateData.password = updateData.password;
    }

    if (Object.keys(authUpdateData).length > 0) {
      const { error: authError } = await tq.raw.auth.admin.updateUserById(userId, authUpdateData);
      if (authError) {
        console.error('Auth update error:', authError);
        // Don't fail the whole update, just log
      }
    }

    // Update user profile if needed
    const profileUpdateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.bio !== undefined) profileUpdateData.bio = updateData.bio;
    if (updateData.avatar !== undefined) profileUpdateData.avatar = updateData.avatar;

    // Handle learning preferences
    if (updateData.grade_level || updateData.subject_areas || updateData.learning_style || updateData.difficulty_preference) {
      // Get existing preferences
      const { data: existingProfile } = await tq
        .from('user_profiles')
        .select('learning_preferences')
        .eq('user_id', userId)
        .maybeSingle();

      const currentPreferences = existingProfile?.learning_preferences || {};
      const newPreferences = { ...currentPreferences };
      
      if (updateData.grade_level) newPreferences.grade_level = updateData.grade_level;
      if (updateData.subject_areas) newPreferences.subject_interests = updateData.subject_areas;
      if (updateData.learning_style) newPreferences.learning_style = updateData.learning_style;
      if (updateData.difficulty_preference) newPreferences.difficulty_preference = updateData.difficulty_preference;
      
      profileUpdateData.learning_preferences = newPreferences;
    }

    // Update or create profile if there are changes
    if (Object.keys(profileUpdateData).length > 1) {
      const { data: existingProfile } = await tq
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile) {
        await tq
          .from('user_profiles')
          .update(profileUpdateData)
          .eq('user_id', userId);
      } else {
        await tq
          .from('user_profiles')
          .insert([{
            user_id: userId,
            ...profileUpdateData,
            created_at: new Date().toISOString()
          }]);
      }
    }

    // Update enrollments with denormalized data if needed
    if (updateData.bio !== undefined || updateData.avatar !== undefined || profileUpdateData.learning_preferences) {
      const enrollmentUpdateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updateData.bio !== undefined) enrollmentUpdateData.student_bio = updateData.bio;
      if (updateData.avatar !== undefined) enrollmentUpdateData.student_avatar = updateData.avatar;
      if (profileUpdateData.learning_preferences) enrollmentUpdateData.learning_preferences = profileUpdateData.learning_preferences;
      if (updateData.gender !== undefined) enrollmentUpdateData.student_gender = updateData.gender;

      await tq
        .from('enrollments')
        .update(enrollmentUpdateData)
        .eq('student_id', userId);
    }

    return { 
      status: 'success', 
      message: 'User updated successfully'
    };

  } catch (error) {
    return { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

