-- Update user role to admin
-- Replace 'YOUR_EMAIL@example.com' with your actual email address
-- Or replace the UUID with your user ID if you know it

-- Option 1: Update by email
UPDATE users 
SET role = 'admin', 
    updated_at = NOW()
WHERE email = 'YOUR_EMAIL@example.com';

-- Option 2: Update by user ID (if you know your UUID)
-- UPDATE users 
-- SET role = 'admin', 
--     updated_at = NOW()
-- WHERE id = 'YOUR_USER_ID_HERE';

-- Verify the update
SELECT id, email, name, role, created_at, updated_at
FROM users
WHERE email = 'YOUR_EMAIL@example.com';
-- (or WHERE id = 'YOUR_USER_ID_HERE' if using Option 2)

