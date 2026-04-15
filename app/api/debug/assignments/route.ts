import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";

export async function GET(request: Request) {
  try {
    console.log('=== DEBUG ASSIGNMENTS API ===');
    
    // Test 1: Check if we can get current user
    console.log('1. Testing authenticateUser...');
    const authResult = await authenticateUser(request as any);
    if (!authResult.success) {
      console.log('User: No user');
      return createAuthResponse(authResult.error!, authResult.status!);
    }
    const user = authResult.userProfile!;
    console.log('User:', { id: user.id, email: user.email, role: user.role });

    // Test 2: Check if we can create Supabase client
    console.log('2. Testing Supabase client...');
    const supabase = await createServerSupabaseClient();
    console.log('Supabase client created successfully');

    // Test 3: Check if assignments table exists and is accessible
    console.log('3. Testing assignments table access...');
    const { data: assignments, error, count } = await supabase
      .from("assignments")
      .select("*", { count: 'exact' })
      .limit(1);

    console.log('Assignments query result:', { 
      data: assignments, 
      error, 
      count,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint
    });

    if (error) {
      return NextResponse.json({ 
        error: "Database query failed",
        details: error,
        step: "assignments table query failed"
      }, { status: 500 });
    }

    // Test 4: Check RLS policies
    console.log('4. Testing RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'assignments' })
      .single();

    console.log('RLS policies check:', { policies, policiesError });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
      assignments: assignments || [],
      count: count || 0,
      policies: policies || 'No policies found',
      message: 'All tests passed'
    });

  } catch (e: any) {
    console.error('DEBUG ASSIGNMENTS API ERROR:', e);
    return NextResponse.json({ 
      error: "Internal server error",
      details: e.message,
      stack: e.stack,
      step: "catch block"
    }, { status: 500 });
  }
}
