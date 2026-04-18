import { NextResponse } from 'next/server';
import { withTenantAuth } from '@/lib/with-tenant-auth';
import { generateSecurePassword } from '@/lib/crypto-random';
import { notifyStudentWelcome } from '@/lib/notifications';

export const POST = withTenantAuth(
  async ({ request, tq, tenantId }) => {
    try {
      const body = await request.json();
      const { email, name, role = 'student', sendInvite = true } = body;

      if (!email || !name) {
        return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
      }

      // Check if user already exists in this tenant
      const { data: existingUser } = await tq
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          { error: 'User with this email already exists in this tenant' },
          { status: 400 }
        );
      }

      // Check if user exists in another tenant — if so, just add tenant membership
      const { data: globalUser } = await tq.raw
        .from('users')
        .select('id, name, email, role')
        .eq('email', email)
        .maybeSingle();

      if (globalUser) {
        const { data: existingMembership } = await tq.raw
          .from('tenant_memberships')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('user_id', globalUser.id)
          .maybeSingle();

        if (existingMembership) {
          return NextResponse.json(
            { error: 'User is already a member of this tenant' },
            { status: 409 }
          );
        }

        await tq.raw.from('tenant_memberships').insert({
          tenant_id: tenantId,
          user_id: globalUser.id,
          role: role || 'student',
          is_primary: false,
        });

        return NextResponse.json({
          message: 'Existing user added to tenant',
          user: globalUser,
          cross_tenant: true,
        });
      }

      // Generate a cryptographically-strong temp password that meets requirements.
      const tempPassword = generateSecurePassword(12);

      const { data: authData, error: authError } = await tq.raw.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: name, role },
      });

      if (authError) {
        console.error('Auth error creating user:', authError);
        return NextResponse.json(
          { error: authError.message || 'Failed to create user account', details: authError.message },
          { status: 500 }
        );
      }

      const { data: userRecord, error: userError } = await tq
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            name,
            role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (userError) {
        console.error('Database error:', userError);
        await tq.raw.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }

      await tq.from('user_profiles').insert([
        {
          user_id: authData.user.id,
          bio: '',
          avatar: null,
          learning_preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      await tq.raw.from('tenant_memberships').insert({
        tenant_id: tenantId,
        user_id: authData.user.id,
        role: role || 'student',
        is_primary: true,
      });

      if (sendInvite && userRecord) {
        try {
          const emailResult = await notifyStudentWelcome(authData.user.id, {
            temporaryPassword: tempPassword,
          });
          if (!emailResult.success) {
            console.error('Failed to send welcome email:', emailResult.error);
          }
        } catch (emailError) {
          console.error('Email error:', emailError);
        }
      }

      return NextResponse.json({
        message: 'User created successfully',
        user: userRecord,
        tempPassword,
        emailSent: sendInvite && userRecord ? true : false,
        note: sendInvite ? 'Welcome email has been sent to the user' : 'User created but email not sent',
      });
    } catch (error) {
      console.error('Admin invite user API error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { requiredRoles: ['admin', 'super_admin', 'curriculum_designer'] }
);
