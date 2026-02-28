import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const courseId = url.searchParams.get('courseId');
  
  console.log('=== DEBUG PARTICIPANTS API ===');
  console.log('Course ID:', courseId);
  console.log('Request URL:', request.url);
  console.log('Request Headers:', Object.fromEntries(request.headers.entries()));

  if (!courseId) {
    return NextResponse.json({ 
      error: 'Course ID is required',
      debug: { courseId, url: request.url }
    }, { status: 400 });
  }

  try {
    // Test 1: Authentication
    console.log('Step 1: Testing authentication...');
    const authResult = await authenticateUser(request);
    console.log('Auth result:', {
      success: authResult.success,
      hasUser: !!authResult.user,
      hasUserProfile: !!authResult.userProfile,
      userRole: authResult.userProfile?.role,
      error: authResult.error
    });

    if (!authResult.success) {
      return NextResponse.json({ 
        error: 'Authentication failed',
        debug: { authResult }
      }, { status: 401 });
    }

    const { user, userProfile } = authResult;

    // Test 2: Supabase connection
    console.log('Step 2: Testing Supabase connection...');
    const supabase = await createServerSupabaseClient();
    console.log('Supabase client created');

    // Test 3: Check if enrollments table exists and has RLS
    console.log('Step 3: Checking enrollments table...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_name', 'enrollments')
      .eq('table_schema', 'public');

    console.log('Table info:', { tableInfo, tableError });

    // Test 4: Check RLS status
    console.log('Step 4: Checking RLS status...');
    let rlsInfo: any = null;
    let rlsError: any = null;
    try {
      const result = await supabase
        .rpc('get_table_rls_status', { table_name: 'enrollments' });
      rlsInfo = result.data;
      rlsError = result.error;
    } catch {
      // Fallback query
      const { data, error } = await supabase
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('tablename', 'enrollments');
      rlsInfo = data;
      rlsError = error;
    }

    console.log('RLS info:', { rlsInfo, rlsError });

    // Test 5: Check enrollments table structure
    console.log('Step 5: Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'enrollments')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    console.log('Columns:', { columns, columnsError });

    // Test 6: Try to query enrollments (this is where it might fail)
    console.log('Step 6: Testing enrollments query...');
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId)
      .limit(5);

    console.log('Enrollments query result:', {
      dataCount: enrollments?.length || 0,
      error: enrollmentsError,
      errorCode: enrollmentsError?.code,
      errorMessage: enrollmentsError?.message,
      errorDetails: enrollmentsError?.details
    });

    // Test 7: Check course existence
    console.log('Step 7: Checking course existence...');
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    console.log('Course query result:', { course, courseError });

    const responseTime = Date.now() - startTime;
    console.log(`Debug completed in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      debug: {
        courseId,
        auth: {
          success: authResult.success,
          userRole: userProfile?.role,
          userId: user?.id
        },
        table: {
          exists: tableInfo && tableInfo.length > 0,
          info: tableInfo
        },
        rls: {
          status: rlsInfo,
          error: rlsError
        },
        structure: {
          columns: columns?.map(c => ({ name: c.column_name, type: c.data_type, nullable: c.is_nullable }))
        },
        query: {
          enrollmentsCount: enrollments?.length || 0,
          error: enrollmentsError,
          errorCode: enrollmentsError?.code,
          errorMessage: enrollmentsError?.message
        },
        course: {
          exists: !!course,
          title: course?.title
        },
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Debug API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      courseId,
      responseTime: `${responseTime}ms`
    });

    return NextResponse.json({
      success: false,
      error: 'Debug failed',
      debug: {
        courseId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: `${responseTime}ms`
      }
    }, { status: 500 });
  }
}
