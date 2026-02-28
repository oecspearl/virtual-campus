import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { authenticateUser } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('=== TEST ENROLLMENTS API ===');
    
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

    // Test 3: Check if enrollments table exists
    console.log('Step 3: Checking enrollments table...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_name', 'enrollments')
      .eq('table_schema', 'public');

    console.log('Table info:', { tableInfo, tableError });

    // Test 4: Check RLS status
    console.log('Step 4: Checking RLS status...');
    const { data: rlsInfo, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('tablename', 'enrollments');

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

    // Test 6: Try to query enrollments
    console.log('Step 6: Testing enrollments query...');
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('*')
      .limit(5);

    console.log('Enrollments query result:', {
      dataCount: enrollments?.length || 0,
      error: enrollmentsError,
      errorCode: enrollmentsError?.code,
      errorMessage: enrollmentsError?.message,
      errorDetails: enrollmentsError?.details
    });

    // Test 7: Try to query with course_id filter
    console.log('Step 7: Testing course_id filter...');
    const { data: courseEnrollments, error: courseError } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', 'b18abae6-6489-43ff-896b-ed3af74101b1')
      .limit(5);

    console.log('Course enrollments query result:', {
      dataCount: courseEnrollments?.length || 0,
      error: courseError,
      errorCode: courseError?.code,
      errorMessage: courseError?.message
    });

    const responseTime = Date.now() - startTime;
    console.log(`Test completed in ${responseTime}ms`);

    return NextResponse.json({
      success: true,
      debug: {
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
          allEnrollmentsCount: enrollments?.length || 0,
          allEnrollmentsError: enrollmentsError,
          allEnrollmentsErrorCode: enrollmentsError?.code,
          allEnrollmentsErrorMessage: enrollmentsError?.message
        },
        courseQuery: {
          courseEnrollmentsCount: courseEnrollments?.length || 0,
          courseEnrollmentsError: courseError,
          courseEnrollmentsErrorCode: courseError?.code,
          courseEnrollmentsErrorMessage: courseError?.message
        },
        responseTime: `${responseTime}ms`
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Test Enrollments API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`
    });

    return NextResponse.json({
      success: false,
      error: 'Test failed',
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: `${responseTime}ms`
      }
    }, { status: 500 });
  }
}
