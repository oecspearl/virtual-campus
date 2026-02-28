-- Test script to verify enrollment functionality
-- This script checks the current state of enrollments and helps debug issues

-- 1. Check if course_id column exists in enrollments table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'enrollments' 
ORDER BY ordinal_position;

-- 2. Check current enrollments data
SELECT 
    id,
    course_id,
    student_id,
    status,
    enrolled_at,
    student_name,
    student_email,
    student_role,
    created_at,
    updated_at
FROM enrollments 
ORDER BY enrolled_at DESC 
LIMIT 10;

-- 3. Check if there are any enrollments without denormalized data
SELECT 
    id,
    course_id,
    student_id,
    status,
    student_name,
    student_email,
    student_role
FROM enrollments 
WHERE student_name IS NULL 
   OR student_email IS NULL 
   OR student_role IS NULL
ORDER BY enrolled_at DESC;

-- 4. Check the enrollment_details view
SELECT 
    enrollment_id,
    course_id,
    student_id,
    student_name,
    student_email,
    student_role,
    course_title,
    status
FROM enrollment_details 
ORDER BY enrolled_at DESC 
LIMIT 10;

-- 5. Check if there are any constraint violations
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'enrollments'::regclass;

-- 6. Test data insertion (this will be rolled back)
BEGIN;
    -- Insert a test enrollment to verify the schema works
    INSERT INTO enrollments (
        course_id, 
        student_id, 
        status, 
        enrolled_at,
        student_name,
        student_email,
        student_role
    ) VALUES (
        (SELECT id FROM courses LIMIT 1),
        (SELECT id FROM users WHERE role = 'student' LIMIT 1),
        'active',
        NOW(),
        'Test User',
        'test@example.com',
        'student'
    );
    
    -- Check if the insertion worked
    SELECT * FROM enrollments WHERE student_email = 'test@example.com';
    
    -- Rollback the test data
ROLLBACK;
