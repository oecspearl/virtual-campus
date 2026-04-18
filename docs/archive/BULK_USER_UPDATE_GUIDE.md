# Bulk User Update Guide

## Overview
The Bulk User Update feature allows administrators to update multiple user profiles simultaneously via CSV upload. This is ideal for updating passwords, gender, and other profile fields for many users at once.

## Features

### Supported Update Fields
- **Basic Information**: name, role, gender
- **Authentication**: password
- **Profile Data**: bio, avatar
- **Learning Preferences**: grade_level, subject_areas, learning_style, difficulty_preference

### Key Capabilities
- **Selective Updates**: Update only the fields you specify
- **User Identification**: Identify users by email or ID
- **Batch Processing**: Process hundreds of users in one operation
- **Detailed Results**: See success/failure status for each user
- **Validation**: Comprehensive field validation before updates

## CSV Format

### Required Columns
At least one of these columns is required to identify users:
- `email` - User's email address
- `id` - User's UUID

### Optional Update Columns
Include only the fields you want to update:
- `name` - Full name
- `role` - User role
- `gender` - Gender (male, female, other, prefer_not_to_say)
- `password` - New password (minimum 8 characters)
- `bio` - Biography
- `avatar` - Avatar URL
- `grade_level` - Grade level
- `subject_areas` - Subject areas of interest
- `learning_style` - Learning style (visual, auditory, kinesthetic, reading/writing)
- `difficulty_preference` - Difficulty preference (beginner, intermediate, advanced)

### CSV Format Example

#### Update Passwords Only
```csv
email,password
john.doe@example.com,NewPassword123
jane.smith@example.com,SecurePass456
```

#### Update Gender and Role
```csv
email,gender,role
john.doe@example.com,male,instructor
jane.smith@example.com,female,admin
```

#### Comprehensive Update
```csv
email,name,role,gender,password,bio,grade_level,subject_areas,learning_style,difficulty_preference
john.doe@example.com,John Doe Updated,instructor,male,NewPass123,"Updated biography",Grade 11,"Math,Physics",visual,advanced
jane.smith@example.com,Jane Smith Updated,admin,female,SecurePass456,"Admin user",,"English,History",auditory,intermediate
```

#### Using User ID Instead of Email
```csv
id,password,gender
550e8400-e29b-41d4-a716-446655440000,NewPassword123,male
6ba7b810-9dad-11d1-80b4-00c04fd430c8,SecurePass456,female
```

## Usage Instructions

### Step 1: Access Bulk Update
1. Navigate to `/admin/users/manage`
2. Click the **"Bulk Update"** button (purple button)
3. The bulk update panel will open

### Step 2: Prepare Your CSV
1. Click **"Download Template"** to get a sample CSV
2. Edit the CSV with your user updates
3. Include only the columns you want to update
4. Ensure email or id column is present

### Step 3: Upload and Process
1. Drag and drop your CSV file or click to browse
2. Review the file details
3. Click **"Start Bulk Update"**
4. Wait for processing to complete

### Step 4: Review Results
1. View summary statistics (total, successful, failed)
2. Check detailed results table
3. Review any errors for failed updates
4. Click **"Update More Users"** to process another batch

## Validation Rules

### Email/ID Validation
- At least one identifier (email or id) must be provided
- User must exist in the database

### Role Validation
- Must be one of: super_admin, admin, instructor, curriculum_designer, student, parent
- Case-sensitive

### Gender Validation
- Must be one of: male, female, other, prefer_not_to_say
- Case-sensitive

### Password Validation
- Minimum 8 characters required
- No maximum length
- Can include letters, numbers, and special characters

### Learning Style Validation
- Must be one of: visual, auditory, kinesthetic, reading/writing

### Difficulty Preference Validation
- Must be one of: beginner, intermediate, advanced

## API Endpoint

### POST /api/admin/users/bulk-update

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: CSV file

**Response:**
```json
{
  "message": "CSV bulk update completed",
  "results": [
    {
      "row": 2,
      "identifier": "user@example.com",
      "status": "success",
      "message": "User updated successfully"
    },
    {
      "row": 3,
      "identifier": "another@example.com",
      "status": "error",
      "error": "User not found"
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1,
  "hasValidationErrors": false
}
```

## What Gets Updated

### Users Table
- `name` - User's full name
- `role` - User role
- `gender` - User gender
- `updated_at` - Automatically set to current timestamp

### Supabase Auth
- `password` - User password (if provided)
- `user_metadata.full_name` - User's full name

### User Profiles Table
- `bio` - User biography
- `avatar` - Avatar URL
- `learning_preferences` - JSONB object containing:
  - `grade_level`
  - `subject_interests`
  - `learning_style`
  - `difficulty_preference`
- `updated_at` - Automatically set to current timestamp

### Enrollments Table (Denormalized Data)
- `student_bio` - User biography
- `student_avatar` - Avatar URL
- `student_gender` - User gender
- `learning_preferences` - Learning preferences object
- `updated_at` - Automatically set to current timestamp

## Best Practices

### Data Preparation
1. **Backup First**: Always backup your database before bulk updates
2. **Test Small**: Test with a small batch first (5-10 users)
3. **Verify Data**: Double-check all data before uploading
4. **Use Templates**: Start with the provided template

### CSV File Management
1. **UTF-8 Encoding**: Save CSV files with UTF-8 encoding
2. **Quote Fields**: Use quotes for fields containing commas
3. **No Empty Rows**: Remove empty rows from CSV
4. **Consistent Headers**: Use exact header names (case-sensitive)

### Password Management
1. **Strong Passwords**: Use strong passwords (8+ characters)
2. **Unique Passwords**: Don't reuse passwords across users
3. **Secure Storage**: Don't store passwords in plain text
4. **User Notification**: Inform users when passwords are changed

### Error Handling
1. **Review Errors**: Always review failed updates
2. **Fix and Retry**: Correct errors and retry failed updates
3. **Partial Success**: Successful updates are committed even if some fail
4. **Log Results**: Save results for audit purposes

## Common Use Cases

### 1. Password Reset for Multiple Users
```csv
email,password
student1@school.com,TempPass123
student2@school.com,TempPass456
student3@school.com,TempPass789
```

### 2. Update Gender for All Users
```csv
email,gender
john@school.com,male
jane@school.com,female
alex@school.com,other
```

### 3. Promote Users to Instructors
```csv
email,role
teacher1@school.com,instructor
teacher2@school.com,instructor
teacher3@school.com,instructor
```

### 4. Update Learning Preferences
```csv
email,grade_level,subject_areas,learning_style,difficulty_preference
student1@school.com,Grade 10,"Math,Science",visual,intermediate
student2@school.com,Grade 11,"English,History",auditory,advanced
```

### 5. Comprehensive Profile Update
```csv
email,name,role,gender,bio,grade_level
user1@school.com,John Doe Updated,student,male,"Enthusiastic learner",Grade 10
user2@school.com,Jane Smith Updated,instructor,female,"Experienced teacher",
```

## Error Messages

### Common Errors
- **"User not found"**: Email or ID doesn't match any user
- **"Invalid role"**: Role value not in allowed list
- **"Invalid gender"**: Gender value not in allowed list
- **"Password must be at least 8 characters long"**: Password too short
- **"No email or id provided"**: Missing user identifier

### Validation Errors
- **"CSV must include either 'email' or 'id' column"**: Missing identifier column
- **"CSV must have at least a header and one data row"**: Empty or invalid CSV
- **"Only CSV files are allowed"**: Wrong file type
- **"File size must be less than 10MB"**: File too large

## Security Considerations

### Access Control
- Only admin and super_admin roles can perform bulk updates
- Authentication required for all operations
- Row-level security enforced

### Password Security
- Passwords are hashed by Supabase Auth
- Passwords are never stored in plain text
- Password changes are immediate
- No password history maintained

### Audit Trail
- All updates are logged
- Results include row numbers and identifiers
- Timestamp automatically recorded
- Consider implementing additional audit logging

## Troubleshooting

### CSV Not Processing
1. Check file format (must be .csv)
2. Verify UTF-8 encoding
3. Ensure headers are correct
4. Remove empty rows

### Updates Failing
1. Verify user exists (check email/id)
2. Check field values against validation rules
3. Ensure admin privileges
4. Review error messages in results

### Partial Updates
1. Review results table for specific errors
2. Fix errors in CSV
3. Re-upload with only failed rows
4. Successful updates don't need to be repeated

### Performance Issues
1. Limit batch size to 500 users
2. Process large updates in multiple batches
3. Avoid peak usage times
4. Monitor server resources

## Limitations

### File Size
- Maximum CSV file size: 10MB
- Recommended batch size: 500 users per upload

### Update Frequency
- No built-in rate limiting
- Consider implementing delays for very large batches

### Field Updates
- Cannot update: id, email, created_at
- Email updates require separate API call
- Cannot delete fields (only update to empty string)

## Future Enhancements

### Potential Features
- **Scheduled Updates**: Schedule bulk updates for specific times
- **Email Notifications**: Notify users of profile changes
- **Rollback**: Undo bulk updates
- **Advanced Validation**: Custom validation rules
- **Progress Tracking**: Real-time progress updates
- **Export Results**: Download results as CSV

## Support

### Getting Help
- Review this documentation
- Check error messages in results
- Test with small batches first
- Contact system administrator

### Reporting Issues
- Include CSV sample (remove sensitive data)
- Provide error messages
- Note number of users affected
- Describe expected vs actual behavior
