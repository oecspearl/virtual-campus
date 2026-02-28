-- Fix existing user: Royston Emmanuel → super_admin
-- Run this in Supabase SQL Editor
-- (The user was auto-created as 'student' by the middleware on first sign-in)

DO $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Step 1: Get the existing user ID
  SELECT id INTO existing_user_id
  FROM public.users
  WHERE email = 'royston.emmanuel@oecs.int';

  IF existing_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found. Sign in first so the middleware creates the auth user, then re-run this script.';
  END IF;

  -- Step 2: Update role to super_admin in public.users
  UPDATE public.users
  SET role = 'super_admin', name = 'Royston Emmanuel', updated_at = NOW()
  WHERE id = existing_user_id;

  -- Step 3: Upsert tenant membership as super_admin
  INSERT INTO public.tenant_memberships (tenant_id, user_id, role, is_primary, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000001', existing_user_id, 'super_admin', true, NOW(), NOW())
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET role = 'super_admin', updated_at = NOW();

  -- Step 4: Ensure user profile exists
  INSERT INTO public.user_profiles (user_id, tenant_id, created_at, updated_at)
  VALUES (existing_user_id, '00000000-0000-0000-0000-000000000001', NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RAISE NOTICE 'User upgraded to super_admin! ID: %', existing_user_id;
END $$;
