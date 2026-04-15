import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createTenantQuery, getTenantIdFromRequest } from "@/lib/tenant-query";
import { authenticateUser, createAuthResponse } from "@/lib/api-auth";
import { hasRole } from '@/lib/rbac';

export async function GET(request: NextRequest) {
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

    // Get all users from our database
    const { data: users, error: usersError } = await tq
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Fetch auth data to get last_sign_in_at for each user
    // Use listUsers to get all auth users with their login info
    const authUsersMap = new Map<string, { last_sign_in_at: string | null }>();

    try {
      const { data: authData, error: authError } = await tq.raw.auth.admin.listUsers({
        perPage: 1000
      });

      if (!authError && authData?.users) {
        (authData.users as any[]).forEach((authUser: any) => {
          authUsersMap.set(authUser.id, {
            last_sign_in_at: authUser.last_sign_in_at || null
          });
        });
      }
    } catch (authErr) {
      console.error('Error fetching auth users:', authErr);
      // Continue without auth data - users will just not have last_login
    }

    // Merge users with their auth data
    const usersWithAuth = (users || []).map(user => ({
      ...user,
      last_login: authUsersMap.get(user.id)?.last_sign_in_at || null
    }));

    return NextResponse.json({ users: usersWithAuth });

  } catch (error) {
    console.error('Admin users GET API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const { email, name, role, password, csv } = body;

    const tenantId = getTenantIdFromRequest(request);
    const tq = createTenantQuery(tenantId);

    if (csv) {
      // Handle CSV import
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const dataLines = lines.slice(1);

      const results = [];
      for (const line of dataLines) {
        if (!line.trim()) continue;
        
        const values = line.split(',').map(v => v.trim());
        const userData = {
          email: values[0],
          name: values[1],
          role: values[2] || 'student'
        };

        try {
          // Create user in Supabase Auth
          const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
            email: userData.email,
            password: 'temp_password_123', // Default password, user should change
            email_confirm: true,
            user_metadata: {
              full_name: userData.name
            }
          });

          if (authError) {
            console.error('Auth error for user:', userData.email, authError);
            results.push({ email: userData.email, error: authError.message });
            continue;
          }

          // Create user in our database
          const { data: userRecord, error: userError } = await tq
            .from('users')
            .insert([{
              id: authData.user.id,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();

          if (userError) {
            console.error('Database error for user:', userData.email, userError);
            results.push({ email: userData.email, error: userError.message });
            continue;
          }

          // Create user profile
          await tq
            .from('user_profiles')
            .insert([{
              user_id: authData.user.id,
              bio: '',
              avatar: null,
              learning_preferences: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]);

          results.push({ email: userData.email, success: true });

        } catch (error) {
          console.error('Error creating user:', userData.email, error);
          results.push({ email: userData.email, error: 'Unknown error' });
        }
      }

      return NextResponse.json({ 
        message: "CSV import completed", 
        results,
        total: dataLines.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => r.error).length
      });

    } else {
      // Handle single user creation
      if (!email || !name || !role) {
        return NextResponse.json({ error: "Email, name, and role are required" }, { status: 400 });
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
        email,
        password: password || 'temp_password_123',
        email_confirm: true,
        user_metadata: {
          full_name: name
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      // Create user in our database
      const { data: userRecord, error: userError } = await tq
        .from('users')
        .insert([{
          id: authData.user.id,
          email,
          name,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (userError) {
        console.error('Database error:', userError);
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }

      // Create user profile
      const { error: profileError } = await tq
        .from('user_profiles')
        .insert([{
          user_id: authData.user.id,
          bio: '',
          avatar: null,
          learning_preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail the request, just log the error
      }

      return NextResponse.json({ 
        message: "User created successfully", 
        user: userRecord 
      });
    }

  } catch (error) {
    console.error('Admin users POST API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}