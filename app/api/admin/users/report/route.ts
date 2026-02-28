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

    const body = await request.json();
    const { 
      fields = [],
      filters = {},
      format = 'csv'
    } = body;

    if (!fields || fields.length === 0) {
      return NextResponse.json({ error: 'No fields selected for export' }, { status: 400 });
    }

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    // Build the query based on selected fields
    const { csvData, filename } = await generateUserReport(fields, filters, tq);

    // Return CSV data
    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('User report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function generateUserReport(selectedFields: string[], filters: any, tq: any) {
  // Define all available fields and their data sources
  const fieldDefinitions = {
    // Basic user fields
    'id': { source: 'users', field: 'id', label: 'User ID' },
    'email': { source: 'users', field: 'email', label: 'Email' },
    'name': { source: 'users', field: 'name', label: 'Name' },
    'role': { source: 'users', field: 'role', label: 'Role' },
    'gender': { source: 'users', field: 'gender', label: 'Gender' },
    'created_at': { source: 'users', field: 'created_at', label: 'Created Date' },
    'updated_at': { source: 'users', field: 'updated_at', label: 'Last Updated' },
    
    // Profile fields
    'bio': { source: 'profiles', field: 'bio', label: 'Biography' },
    'avatar': { source: 'profiles', field: 'avatar', label: 'Avatar URL' },
    
    // Learning preferences (from profiles)
    'grade_level': { source: 'profiles', field: 'learning_preferences->grade_level', label: 'Grade Level' },
    'subject_areas': { source: 'profiles', field: 'learning_preferences->subject_interests', label: 'Subject Areas' },
    'learning_style': { source: 'profiles', field: 'learning_preferences->learning_style', label: 'Learning Style' },
    'difficulty_preference': { source: 'profiles', field: 'learning_preferences->difficulty_preference', label: 'Difficulty Preference' },
    
    // Enrollment statistics
    'enrollment_count': { source: 'enrollments', field: 'count', label: 'Course Enrollments' },
    'active_enrollments': { source: 'enrollments', field: 'active_count', label: 'Active Enrollments' },
    'completed_enrollments': { source: 'enrollments', field: 'completed_count', label: 'Completed Enrollments' },
    
    // Course information (if enrolled)
    'enrolled_courses': { source: 'enrollments', field: 'course_titles', label: 'Enrolled Courses' },
    
    // Activity statistics
    'last_login': { source: 'auth', field: 'last_sign_in_at', label: 'Last Login' },
    'login_count': { source: 'auth', field: 'sign_in_count', label: 'Login Count' }
  };

  // Build the base query
  let query = tq
    .from('users')
    .select(`
      id,
      email,
      name,
      role,
      gender,
      created_at,
      updated_at,
      user_profiles!left (
        bio,
        avatar,
        learning_preferences
      )
    `);

  // Apply filters
  if (filters.role && filters.role.length > 0) {
    query = query.in('role', filters.role);
  }
  
  if (filters.gender && filters.gender.length > 0) {
    query = query.in('gender', filters.gender);
  }
  
  if (filters.created_after) {
    query = query.gte('created_at', filters.created_after);
  }
  
  if (filters.created_before) {
    query = query.lte('created_at', filters.created_before);
  }

  // Execute the main query
  const { data: users, error: usersError } = await query;

  if (usersError) {
    throw new Error(`Failed to fetch users: ${usersError.message}`);
  }

  // Get enrollment data for users who have enrollments
  const userIds = users.map(u => u.id);
  const { data: enrollments } = await tq
    .from('enrollments')
    .select(`
      student_id,
      status,
      course_id,
      courses!inner (title)
    `)
    .in('student_id', userIds);

  // Process enrollment data
  const enrollmentStats = {};
  const courseTitles = {};
  
  if (enrollments) {
    enrollments.forEach(enrollment => {
      const userId = enrollment.student_id;
      
      if (!enrollmentStats[userId]) {
        enrollmentStats[userId] = {
          total: 0,
          active: 0,
          completed: 0,
          courses: []
        };
      }
      
      enrollmentStats[userId].total++;
      if (enrollment.status === 'active') enrollmentStats[userId].active++;
      if (enrollment.status === 'completed') enrollmentStats[userId].completed++;
      
      if (enrollment.courses?.title) {
        enrollmentStats[userId].courses.push(enrollment.courses.title);
      }
    });
  }

  // Generate CSV data
  const headers = selectedFields.map(field => fieldDefinitions[field]?.label || field);
  const csvRows = [];

  // Add header row
  csvRows.push(headers.join(','));

  // Add data rows
  users.forEach(user => {
    const row = selectedFields.map(field => {
      const fieldDef = fieldDefinitions[field];
      if (!fieldDef) return '';

      let value = '';

      switch (fieldDef.source) {
        case 'users':
          value = user[fieldDef.field] || '';
          break;
          
        case 'profiles':
          if (fieldDef.field.startsWith('learning_preferences->')) {
            const prefKey = fieldDef.field.replace('learning_preferences->', '');
            value = user.user_profiles?.learning_preferences?.[prefKey] || '';
          } else {
            value = user.user_profiles?.[fieldDef.field] || '';
          }
          break;
          
        case 'enrollments':
          const stats = enrollmentStats[user.id] || { total: 0, active: 0, completed: 0, courses: [] };
          switch (fieldDef.field) {
            case 'count':
              value = stats.total;
              break;
            case 'active_count':
              value = stats.active;
              break;
            case 'completed_count':
              value = stats.completed;
              break;
            case 'course_titles':
              value = stats.courses.join('; ');
              break;
          }
          break;
          
        case 'auth':
          // Note: Auth data would need to be fetched separately from Supabase Auth
          // For now, we'll return empty values for auth fields
          value = '';
          break;
      }

      // Format the value for CSV
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      // Format dates
      if (fieldDef.field === 'created_at' || fieldDef.field === 'updated_at') {
        if (value) {
          value = new Date(value).toLocaleDateString();
        }
      }

      return value;
    });

    csvRows.push(row.join(','));
  });

  const csvData = csvRows.join('\n');
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `user-report-${timestamp}.csv`;

  return { csvData, filename };
}

