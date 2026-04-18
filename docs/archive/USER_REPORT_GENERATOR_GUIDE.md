# User Report Generator Guide

## Overview
The User Report Generator allows administrators to create customized CSV reports containing user data. You can select specific fields to include and apply filters to generate targeted reports for analysis, auditing, or data export purposes.

## Features

### Field Selection
- **Customizable Reports**: Choose exactly which fields to include
- **Grouped Fields**: Fields organized by category for easy selection
- **Select All/Deselect All**: Quick selection options for each field group
- **Field Descriptions**: Clear descriptions for each available field

### Filtering Options
- **Role Filtering**: Include users with specific roles
- **Gender Filtering**: Filter by user gender
- **Date Range Filtering**: Filter by account creation date
- **Multiple Filters**: Combine multiple filters for precise results

### Export Format
- **CSV Format**: Standard comma-separated values format
- **Automatic Download**: Reports download directly to your computer
- **Timestamped Filenames**: Files include generation date for organization

## Available Fields

### Basic Information
- **User ID**: Unique identifier for each user
- **Email**: User's email address
- **Name**: Full name
- **Role**: User role (admin, student, instructor, etc.)
- **Gender**: User gender (male, female, other, prefer_not_to_say)
- **Created Date**: Account creation date
- **Last Updated**: Last profile update date

### Profile Information
- **Biography**: User biography text
- **Avatar URL**: Profile picture URL

### Learning Preferences
- **Grade Level**: Academic grade level
- **Subject Areas**: Areas of interest/subjects
- **Learning Style**: Preferred learning method (visual, auditory, kinesthetic, reading/writing)
- **Difficulty Preference**: Preferred difficulty level (beginner, intermediate, advanced)

### Enrollment Statistics
- **Total Enrollments**: Number of course enrollments
- **Active Enrollments**: Currently active enrollments
- **Completed Enrollments**: Finished courses
- **Enrolled Courses**: List of enrolled course titles

## Usage Instructions

### Step 1: Access Report Generator
1. Navigate to `/admin/users/manage`
2. Click the **"Download Report"** button (green button)
3. The report generator panel will open

### Step 2: Select Fields
1. **Choose Field Groups**: Expand each category to see available fields
2. **Select Individual Fields**: Check the boxes for fields you want to include
3. **Use Select All**: Click "Select All" to include all fields in a category
4. **Review Selection**: Check the summary at the bottom to confirm your selection

### Step 3: Apply Filters (Optional)
1. **Role Filter**: Select specific user roles to include
2. **Gender Filter**: Choose specific genders to include
3. **Date Filters**: Set creation date range
   - **Created After**: Include users created after this date
   - **Created Before**: Include users created before this date

### Step 4: Generate Report
1. Click **"Download Report"** button
2. Wait for processing to complete
3. File will automatically download to your computer
4. Filename format: `user-report-YYYY-MM-DD.csv`

## Field Categories

### Basic Information Fields
Essential user data that's always available:
- User identification (ID, email, name)
- Account information (role, creation date)
- Profile updates (last updated, gender)

### Profile Information Fields
Additional user profile data:
- Personal information (biography)
- Media (avatar URL)

### Learning Preferences Fields
Educational preferences and settings:
- Academic level (grade level)
- Subject interests
- Learning methodology preferences
- Difficulty preferences

### Enrollment Statistics Fields
Course enrollment data and statistics:
- Enrollment counts (total, active, completed)
- Course information (enrolled course titles)

## Filter Options

### Role Filter
Select from available roles:
- **Super Admin**: System administrators
- **Admin**: Platform administrators
- **Instructor**: Course instructors
- **Curriculum Designer**: Content creators
- **Student**: Regular users
- **Parent**: Parent accounts

### Gender Filter
Filter by gender options:
- **Male**: Male users
- **Female**: Female users
- **Other**: Other gender identity
- **Prefer Not to Say**: Users who prefer not to specify

### Date Range Filter
Filter by account creation date:
- **Created After**: Include users created on or after this date
- **Created Before**: Include users created on or before this date
- **Format**: YYYY-MM-DD (e.g., 2024-01-01)

## Report Examples

### Basic User List
**Fields**: email, name, role, created_at
**Use Case**: Simple user directory
**Result**: Clean list of all users with basic information

### Student Analysis Report
**Fields**: email, name, grade_level, subject_areas, enrollment_count, active_enrollments
**Filters**: role = "student"
**Use Case**: Analyze student engagement and preferences

### Instructor Performance Report
**Fields**: email, name, enrolled_courses, completed_enrollments
**Filters**: role = "instructor"
**Use Case**: Track instructor course completion rates

### Gender Distribution Report
**Fields**: email, name, gender, role, created_at
**Use Case**: Analyze user demographics

### Recent User Report
**Fields**: email, name, role, created_at, bio
**Filters**: created_after = "2024-01-01"
**Use Case**: New user onboarding analysis

## CSV Format Details

### File Structure
- **Header Row**: Column names matching selected fields
- **Data Rows**: One row per user matching filter criteria
- **Encoding**: UTF-8 for international characters
- **Separator**: Comma (,)
- **Quote Character**: Double quotes (") for fields containing commas

### Data Formatting
- **Dates**: Formatted as MM/DD/YYYY
- **Lists**: Course titles separated by semicolon (;)
- **Empty Values**: Blank cells for missing data
- **Special Characters**: Properly escaped in CSV format

### Example CSV Output
```csv
Email,Name,Role,Gender,Created Date,Grade Level,Enrollments
john.doe@example.com,John Doe,student,male,01/15/2024,Grade 10,3
jane.smith@example.com,Jane Smith,instructor,female,12/01/2023,,5
alex.jones@example.com,Alex Jones,student,other,02/20/2024,Grade 11,2
```

## Best Practices

### Field Selection
1. **Start Simple**: Begin with basic fields (email, name, role)
2. **Add Gradually**: Include additional fields as needed
3. **Consider Purpose**: Select fields relevant to your analysis
4. **Avoid Overload**: Too many fields can make reports hard to read

### Filtering Strategy
1. **Use Filters**: Apply filters to focus on relevant users
2. **Date Ranges**: Use date filters for time-based analysis
3. **Role Filtering**: Filter by role for role-specific reports
4. **Test Filters**: Verify filter results before generating large reports

### Data Management
1. **Regular Reports**: Generate reports regularly for tracking
2. **File Organization**: Use descriptive filenames and organize by date
3. **Data Privacy**: Handle user data according to privacy policies
4. **Backup**: Keep copies of important reports

## Common Use Cases

### 1. User Directory Export
**Purpose**: Create a complete user directory
**Fields**: email, name, role, created_at
**Filters**: None
**Frequency**: Monthly

### 2. Student Progress Tracking
**Purpose**: Monitor student enrollment and progress
**Fields**: email, name, grade_level, enrollment_count, active_enrollments
**Filters**: role = "student"
**Frequency**: Weekly

### 3. Instructor Performance Review
**Purpose**: Evaluate instructor effectiveness
**Fields**: email, name, enrolled_courses, completed_enrollments
**Filters**: role = "instructor"
**Frequency**: Quarterly

### 4. New User Analysis
**Purpose**: Track new user registrations
**Fields**: email, name, role, gender, created_at, bio
**Filters**: created_after = "last month"
**Frequency**: Monthly

### 5. Demographic Analysis
**Purpose**: Understand user demographics
**Fields**: email, name, gender, role, grade_level, subject_areas
**Filters**: None
**Frequency**: Annually

### 6. Course Enrollment Report
**Purpose**: Analyze course popularity
**Fields**: email, name, enrolled_courses, enrollment_count
**Filters**: enrollment_count > 0
**Frequency**: Monthly

## Technical Details

### API Endpoint
- **URL**: `/api/admin/users/report`
- **Method**: POST
- **Authentication**: Admin/super_admin required
- **Response**: CSV file download

### Performance Considerations
- **Large Datasets**: Reports with many users may take longer to generate
- **Complex Filters**: Multiple filters may increase processing time
- **Field Count**: More fields require more data processing
- **Network**: Large files may take time to download

### Data Sources
- **Users Table**: Basic user information
- **User Profiles Table**: Profile and preference data
- **Enrollments Table**: Course enrollment statistics
- **Courses Table**: Course information for enrolled courses

## Error Handling

### Common Issues
- **No Fields Selected**: Must select at least one field
- **Invalid Filters**: Date filters must be valid dates
- **Large Reports**: Very large reports may timeout
- **Network Issues**: Download may fail with poor connection

### Troubleshooting
1. **Check Field Selection**: Ensure at least one field is selected
2. **Verify Filters**: Check date formats and filter values
3. **Try Smaller Reports**: Reduce fields or apply more filters
4. **Check Connection**: Ensure stable internet connection
5. **Retry**: Try generating the report again

## Security Considerations

### Access Control
- **Admin Only**: Only admin and super_admin roles can generate reports
- **Authentication**: Valid session required
- **Authorization**: Role-based access control enforced

### Data Privacy
- **Sensitive Data**: Reports may contain personal information
- **Secure Handling**: Handle downloaded reports securely
- **Data Retention**: Follow data retention policies
- **Access Logging**: Consider implementing audit logging

### Export Security
- **File Security**: Secure downloaded CSV files
- **Data Sharing**: Be cautious when sharing reports
- **Encryption**: Consider encrypting sensitive reports
- **Access Control**: Limit access to generated reports

## Limitations

### Field Limitations
- **Auth Data**: Some authentication data not available
- **Real-time Data**: Data reflects time of report generation
- **Calculated Fields**: Some statistics are calculated at generation time

### Performance Limitations
- **Large Datasets**: Very large user bases may impact performance
- **Complex Queries**: Multiple filters may slow generation
- **Concurrent Users**: Multiple simultaneous reports may impact performance

### Format Limitations
- **CSV Only**: Only CSV format currently supported
- **Character Encoding**: Some special characters may not display correctly
- **File Size**: Very large reports may have file size limits

## Future Enhancements

### Potential Features
- **Additional Formats**: PDF, Excel export options
- **Scheduled Reports**: Automated report generation
- **Custom Templates**: Save field selections as templates
- **Advanced Filters**: More sophisticated filtering options
- **Real-time Data**: Live data updates during generation
- **Report Sharing**: Share reports with other admins
- **Data Visualization**: Charts and graphs in reports

### Integration Possibilities
- **Email Delivery**: Email reports to administrators
- **Cloud Storage**: Save reports to cloud storage
- **API Integration**: Integrate with external reporting tools
- **Dashboard Integration**: Embed reports in admin dashboard

## Support

### Getting Help
- **Documentation**: Review this guide for common questions
- **Field Descriptions**: Check field descriptions in the interface
- **Error Messages**: Read error messages for specific issues
- **Admin Support**: Contact system administrator for technical issues

### Best Practices Summary
1. **Start Simple**: Begin with basic fields and no filters
2. **Test First**: Generate small reports before large ones
3. **Use Filters**: Apply filters to focus on relevant data
4. **Organize Files**: Use descriptive filenames and organize by date
5. **Handle Securely**: Protect downloaded reports containing personal data
6. **Regular Updates**: Generate reports regularly for ongoing analysis
