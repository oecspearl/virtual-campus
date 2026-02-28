-- Migration: 008-fix-study-group-trigger.sql
-- Fix the auto_add_group_creator trigger to handle duplicates gracefully

-- Update the trigger function to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION auto_add_group_creator()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO study_group_members (group_id, student_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (group_id, student_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS study_groups_add_creator_trigger ON study_groups;
CREATE TRIGGER study_groups_add_creator_trigger
    AFTER INSERT ON study_groups
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_group_creator();
