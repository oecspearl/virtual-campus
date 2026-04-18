# User Onboarding and Profile Management Guide

## New User Sign-In Process

### Initial Account Access
New users receive their account credentials through one of these methods:

1. **Admin Invitation**: Administrators can invite users via the "Invite User" feature, which:
   - Creates a user account with a temporary password
   - Sends a welcome email with login instructions
   - Provides the temporary password for initial access

2. **CSV Bulk Import**: Administrators can create multiple users at once via CSV upload, which:
   - Creates user accounts with specified passwords
   - Automatically enrolls users in designated courses
   - Includes user profile information (gender, grade level, etc.)

### First-Time Login
1. Navigate to the sign-in page (`/auth/signin`)
2. Enter the provided email address and temporary password
3. Click "Sign In" to access the platform
4. **Important**: Users should change their password immediately after first login

## Profile Management

### Accessing Profile Settings
1. Navigate to the profile page (`/profile`)
2. The profile page displays:
   - Personal information (name, email, role)
   - Profile picture and biography
   - Learning preferences and settings
   - Account creation and update dates

### Updating Profile Information
Users can edit the following profile fields:

**Basic Information:**
- Full name (required)
- Biography (optional)
- Avatar URL (optional)

**Learning Preferences:**
- Learning style (visual, auditory, kinesthetic, reading/writing)
- Difficulty preference (beginner, intermediate, advanced)
- Subject areas of interest

**AI Tutor Preferences:**
- Personalized learning settings
- Tutoring preferences and configurations

### Saving Changes
1. Make desired changes to profile fields
2. Click "Save Changes" button
3. Changes are applied immediately
4. Success message confirms the update

## Password Management

### Changing Your Password
Users can change their password through their profile page:

1. **Access Password Change Section**:
   - Navigate to `/profile`
   - Scroll to the "Change Password" section

2. **Enter Current Password**:
   - Type your current password
   - Use the eye icon to toggle visibility if needed

3. **Create New Password**:
   - Enter a new password meeting the requirements:
     - Minimum 8 characters
     - At least one uppercase letter (A-Z)
     - At least one lowercase letter (a-z)
     - At least one number (0-9)
     - Optional: Special characters for stronger passwords
   - Watch the real-time strength indicator

4. **Confirm New Password**:
   - Re-enter the new password
   - Ensure it matches exactly

5. **Submit Changes**:
   - Click "Change Password" button
   - Password is updated immediately
   - Success message confirms the change

### Password Requirements
- **Minimum Length**: 8 characters
- **Complexity**: Must include uppercase, lowercase, and numbers
- **Security**: Cannot reuse current password
- **Validation**: Real-time feedback on password strength

### Security Features
- **Rate Limiting**: Maximum 5 password change attempts per 5 minutes
- **Current Password Verification**: Must know current password to change
- **Secure Storage**: Passwords are hashed by Supabase Auth
- **Session Security**: Maintains secure session after password change

## Important Notes

### For New Users
- **Change Password Immediately**: Use the temporary password only for initial login
- **Use Strong Passwords**: Follow the password requirements for security
- **Complete Profile**: Fill out learning preferences for better experience
- **Contact Admin**: Reach out to administrators if you need help

### For Administrators
- **Monitor New Users**: Check that users are changing their passwords
- **Provide Support**: Help users with profile setup and password changes
- **Security Awareness**: Educate users about password security best practices

### Self-Registration
- **Disabled**: Users cannot create their own accounts
- **Admin-Only**: All new accounts must be created by administrators
- **Controlled Access**: This ensures proper user management and security

## Getting Help

### Common Issues
- **Forgot Password**: Contact administrator for password reset
- **Profile Not Saving**: Check internet connection and try again
- **Password Requirements**: Ensure password meets all requirements
- **Login Problems**: Verify email and password are correct

### Support
- **Administrator Contact**: Reach out to system administrators
- **Error Messages**: Read error messages carefully for guidance
- **Documentation**: Refer to this guide for step-by-step instructions

This process ensures secure user onboarding while providing users with the tools they need to manage their accounts and maintain security best practices.
