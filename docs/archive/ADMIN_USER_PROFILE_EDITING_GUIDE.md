# Admin User Profile Editing Guide

## Overview
Administrators can now comprehensively edit user profiles, including all user fields, profile information, learning preferences, and passwords. This provides complete control over user management.

## Features

### 1. **Comprehensive Profile Editing**
- **Basic Information**: Name, email, role, gender
- **Profile Data**: Biography, avatar URL
- **Learning Preferences**: Grade level, subject areas, learning style, difficulty preference
- **Password Management**: Reset user passwords with immediate effect

### 2. **Two Editing Modes**
- **Quick Edit**: Inline editing for basic fields (name, email, role)
- **Full Profile**: Comprehensive modal for all user data

### 3. **Admin-Only Access**
- Requires admin or super_admin role
- Secure API endpoints with authentication
- Row-level security enforcement

## User Interface

### User Management Table
The user management page now includes two action buttons for each user:

1. **Quick Edit** (Blue button)
   - Inline editing for name, email, role
   - Fast updates for basic information
   - Immediate save/cancel options

2. **Full Profile** (Green button)
   - Opens comprehensive editing modal
   - Access to all user fields and preferences
   - Password reset functionality

### Profile Editing Modal
The full profile modal includes:

#### Basic Information Section
- **Full Name** (required)
- **Email Address** (required)
- **Role** (dropdown with all available roles)
- **Gender** (optional dropdown)

#### Password Management
- **New Password** field with reset button
- **Reset Password** button (orange)
- Immediate password change functionality
- Minimum 8 character validation

#### Profile Information
- **Biography** (textarea)
- **Avatar URL** (URL input)

#### Learning Preferences Section
- **Grade Level** (text input)
- **Subject Areas** (text input)
- **Learning Style** (dropdown: visual, auditory, kinesthetic, reading/writing)
- **Difficulty Preference** (dropdown: beginner, intermediate, advanced)

## API Endpoints

### 1. **GET /api/admin/users/[id]**
Fetches complete user data including profile information.

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "student",
    "gender": "male",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "profile": {
      "bio": "User biography",
      "avatar": "https://example.com/avatar.jpg",
      "learning_preferences": {
        "grade_level": "Grade 10",
        "subject_interests": "Math, Science",
        "learning_style": "visual",
        "difficulty_preference": "intermediate"
      }
    }
  }
}
```

### 2. **PUT /api/admin/users/[id]**
Updates user profile with comprehensive data.

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "role": "student",
  "gender": "female",
  "password": "newpassword123",
  "bio": "Updated biography",
  "avatar": "https://example.com/new-avatar.jpg",
  "grade_level": "Grade 11",
  "subject_areas": "Math, Physics",
  "learning_style": "kinesthetic",
  "difficulty_preference": "advanced"
}
```

**Features:**
- Updates users table
- Updates user_profiles table
- Updates Supabase Auth (email, password, metadata)
- Updates enrollments table with denormalized data
- Creates profile if it doesn't exist

### 3. **POST /api/admin/users/[id]/reset-password**
Immediately resets user password.

**Request Body:**
```json
{
  "password": "newpassword123"
}
```

**Features:**
- Immediate password change
- Minimum 8 character validation
- Admin-only access
- Secure password handling through Supabase Auth

## Database Updates

### Users Table
- Added `gender` field with CHECK constraint
- Supports: male, female, other, prefer_not_to_say

### User Profiles Table
- `bio` - User biography
- `avatar` - Avatar URL
- `learning_preferences` - JSONB field containing:
  - `grade_level`
  - `subject_interests`
  - `learning_style`
  - `difficulty_preference`

### Enrollments Table
- Denormalized user data for performance
- Automatically updated when user profile changes
- Includes `student_gender` field

## Security Features

### Authentication & Authorization
- Admin/super_admin role required
- JWT token validation
- Row-level security enforcement

### Password Security
- Minimum 8 character requirement
- Secure handling through Supabase Auth
- Immediate password change
- No password history storage

### Data Validation
- Email format validation
- Role validation against allowed values
- Gender validation against allowed values
- URL validation for avatar field

## Usage Instructions

### For Administrators

1. **Access User Management**
   - Navigate to `/admin/users/manage`
   - Ensure you have admin privileges

2. **Quick Edit**
   - Click "Quick Edit" button for basic fields
   - Make changes inline
   - Click "Save" or "Cancel"

3. **Full Profile Edit**
   - Click "Full Profile" button
   - Complete modal opens with all fields
   - Edit any combination of fields
   - Click "Save Changes" to update

4. **Password Reset**
   - Open Full Profile modal
   - Enter new password (minimum 8 characters)
   - Click "Reset" button
   - Password changes immediately

### Field Descriptions

#### Required Fields
- **Name**: User's full name
- **Email**: Valid email address
- **Role**: User role (affects permissions)

#### Optional Fields
- **Gender**: User's gender preference
- **Biography**: Personal description
- **Avatar URL**: Profile picture URL
- **Grade Level**: Academic level
- **Subject Areas**: Areas of interest
- **Learning Style**: Preferred learning method
- **Difficulty Preference**: Preferred challenge level

## Error Handling

### Common Errors
- **403 Forbidden**: Insufficient admin privileges
- **400 Bad Request**: Invalid data format
- **404 Not Found**: User doesn't exist
- **500 Internal Server Error**: Database or auth service error

### Validation Errors
- **Email format**: Invalid email address
- **Password length**: Less than 8 characters
- **Role validation**: Invalid role value
- **Gender validation**: Invalid gender value

### User Feedback
- Success messages for successful operations
- Error messages with specific details
- Loading states during operations
- Form validation with real-time feedback

## Best Practices

### For Administrators
1. **Verify Changes**: Always review changes before saving
2. **Password Security**: Use strong passwords for resets
3. **Data Accuracy**: Ensure all information is current and accurate
4. **Privacy**: Respect user privacy when editing profiles

### For System Administrators
1. **Backup**: Regular database backups before bulk changes
2. **Monitoring**: Monitor admin actions for security
3. **Audit Trail**: Consider implementing audit logging
4. **Testing**: Test changes in development environment first

## Troubleshooting

### Common Issues
- **Modal won't open**: Check admin privileges and user ID
- **Changes not saving**: Verify all required fields are filled
- **Password reset fails**: Check password meets requirements
- **Profile not updating**: Ensure user profile exists

### Debug Steps
1. Check browser console for errors
2. Verify admin role permissions
3. Check API endpoint responses
4. Validate data format and requirements

## Future Enhancements

### Potential Features
- **Bulk editing**: Edit multiple users simultaneously
- **Profile templates**: Predefined profile configurations
- **Audit logging**: Track all admin changes
- **Advanced permissions**: Granular editing permissions
- **Import/Export**: Profile data import/export functionality
