# Enhanced CSV User Upload Guide

## Overview
The CSV user upload feature has been enhanced to support additional fields including gender, custom passwords, and automatic course enrollment.

## New CSV Fields

### Required Fields (unchanged)
- `email` - User's email address (must be valid email format)
- `name` - User's full name
- `role` - User role (super_admin, admin, instructor, curriculum_designer, student, parent)

### New Optional Fields
- `gender` - User's gender (male, female, other, prefer_not_to_say)
- `password` - Custom password (minimum 8 characters, leave empty for auto-generated)
- `course_ids` - Comma-separated course UUIDs for automatic enrollment

### Existing Optional Fields
- `grade_level` - User's grade level
- `subject_areas` - Subject areas of interest
- `learning_style` - Learning style preference
- `difficulty_preference` - Difficulty preference
- `bio` - User biography
- `parent_email` - Parent's email address

## CSV Format Example

```csv
email,name,role,gender,password,course_ids,grade_level,subject_areas,learning_style,difficulty_preference,bio,parent_email
john.doe@example.com,John Doe,student,male,MyPassword123,"course-uuid-1,course-uuid-2",Grade 10,"Math,Science",visual,intermediate,"Student interested in STEM",parent@example.com
jane.smith@example.com,Jane Smith,student,female,,course-uuid-1,Grade 9,"English,History",auditory,beginner,"Loves reading and writing",
admin@school.com,Admin User,admin,other,AdminPass456,,,,"",advanced,"School administrator",
```

## Features

### 1. Gender Field
- Optional field with predefined values
- Stored in the `users` table
- Also stored in `enrollments` table for denormalization

### 2. Custom Passwords
- If password field is empty, a random password is generated
- If password is provided, it must be at least 8 characters
- Passwords are used for Supabase Auth user creation

### 3. Automatic Course Enrollment
- Course IDs should be valid UUIDs
- Multiple course IDs can be provided (comma-separated)
- System checks if courses exist before enrollment
- Prevents duplicate enrollments
- Creates enrollment records with denormalized user data

## Database Changes

### Users Table
```sql
ALTER TABLE users ADD COLUMN gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
```

### Enrollments Table
```sql
ALTER TABLE enrollments ADD COLUMN student_gender VARCHAR(20);
```

## Validation Rules

### Email
- Must be valid email format
- Required field

### Name
- Required field
- Cannot be empty

### Role
- Required field
- Must be one of: super_admin, admin, instructor, curriculum_designer, student, parent

### Gender
- Optional field
- If provided, must be one of: male, female, other, prefer_not_to_say

### Password
- Optional field
- If provided, must be at least 8 characters long
- If empty, system generates random password

### Course IDs
- Optional field
- If provided, must be valid UUIDs
- Multiple IDs separated by commas
- System validates course existence

## Import Process

1. **File Upload**: CSV file is uploaded and parsed
2. **Validation**: Each row is validated according to rules
3. **Preview**: Users can review and edit data before import
4. **Import**: 
   - Creates Supabase Auth user
   - Creates user record in database
   - Creates user profile
   - Enrolls in specified courses (if any)
5. **Results**: Shows success/error status for each user

## Error Handling

- **Validation Errors**: Shown in preview table with specific field errors
- **Import Errors**: Shown in results modal
- **Course Enrollment Errors**: Individual course enrollment failures don't stop user creation
- **Duplicate Prevention**: Existing users and enrollments are skipped

## Usage Tips

1. **Course IDs**: Get course UUIDs from the courses table or admin interface
2. **Passwords**: Leave empty for auto-generated passwords, or provide secure passwords
3. **Gender**: Use exact values: male, female, other, prefer_not_to_say
4. **Large Files**: System handles up to 10MB CSV files
5. **Testing**: Test with small files first to verify format

## Troubleshooting

### Common Issues
- **Invalid email format**: Check for typos and special characters
- **Invalid role**: Use exact role names (case-sensitive)
- **Course not found**: Verify course UUIDs exist in database
- **Password too short**: Minimum 8 characters required
- **Invalid gender**: Use only allowed values

### Error Messages
- Field-specific errors shown in preview table
- Import results show detailed success/failure status
- Console logs provide additional debugging information

## Security Notes

- Passwords are handled securely through Supabase Auth
- CSV files are processed server-side
- Admin privileges required for import
- User data is validated before database insertion
