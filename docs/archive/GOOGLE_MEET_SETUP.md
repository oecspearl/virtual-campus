# Google Meet Auto-Generation Setup

This guide explains how to configure Google Calendar API to automatically generate Google Meet links when scheduling conferences.

## Overview

When Google Calendar API is configured, the system will automatically create valid Google Meet links for scheduled conferences. Without this configuration, teachers must manually provide Google Meet links.

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### Step 2: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - **Name**: `lms-google-meet` (or any name you prefer)
   - **Description**: Service account for generating Google Meet links
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

### Step 3: Generate Service Account Key

1. Click on the service account you just created
2. Go to the "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" format
5. Download the JSON file (keep it secure!)

### Step 4: Share Calendar with Service Account

1. Open the downloaded JSON file
2. Copy the `client_email` value (e.g., `lms-google-meet@your-project.iam.gserviceaccount.com`)
3. Open [Google Calendar](https://calendar.google.com/)
4. Go to "Settings" > "Settings for my calendars"
5. Select the calendar you want to use (or create a new one)
6. Scroll to "Share with specific people"
7. Click "Add people"
8. Paste the service account email
9. Set permission to "Make changes to events"
10. Click "Send"

### Step 5: Configure Environment Variables

Add the following to your `.env.local` file (or your hosting platform's environment variables):

```env
# Google Calendar API Configuration (for auto-generating Google Meet links)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=primary
```

**Important Notes:**
- The `GOOGLE_SERVICE_ACCOUNT_EMAIL` is the `client_email` from the JSON file
- The `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is the `private_key` from the JSON file
- Keep the `\n` characters in the private key - they are required
- Wrap the private key in quotes if it contains special characters
- `GOOGLE_CALENDAR_ID` can be:
  - `primary` (default calendar)
  - A specific calendar ID (found in calendar settings)

### Step 6: Extract Credentials from JSON

From the downloaded JSON file, extract:

```json
{
  "client_email": "your-service-account@project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

## How It Works

1. **With API Configured:**
   - When a teacher schedules a Google Meet conference with a date/time
   - The system creates a Google Calendar event with a Meet link
   - The Meet link is automatically saved and available to students immediately
   - No manual link entry required

2. **Without API Configured:**
   - Teachers must manually create a Google Meet link
   - They can create one at [meet.google.com/new](https://meet.google.com/new)
   - The link must be provided in the conference form

## Troubleshooting

### Error: "Failed to create Google Meet link"

**Possible causes:**
1. Service account email is incorrect
2. Private key is malformed (check for proper `\n` characters)
3. Calendar API is not enabled
4. Service account doesn't have access to the calendar

**Solutions:**
1. Verify the service account email matches the one in your JSON file
2. Ensure the private key includes `\n` characters for line breaks
3. Check that Google Calendar API is enabled in Google Cloud Console
4. Verify the service account has "Make changes to events" permission on the calendar

### Error: "Google Meet link is required"

This means the API is not configured. Either:
- Configure the API following the steps above, OR
- Manually provide a Google Meet link in the form

## Security Notes

- **Never commit** the service account JSON file or private key to version control
- Store credentials securely in environment variables
- Use a dedicated service account (not your personal Google account)
- Limit the service account's permissions to only what's needed

## Testing

After configuration, test by:
1. Creating a new Google Meet conference
2. Setting a scheduled date/time
3. Leaving the Google Meet link field empty
4. Submitting the form
5. The system should automatically generate a valid Meet link

If successful, you'll see the Meet link in the conference details and students can access it immediately.

