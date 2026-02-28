# 🎨 Branding CMS Guide

## Overview
The Branding CMS feature allows admin users to edit site branding, logos, and visual identity without requiring code changes or deployments.

## 🚀 Setup Instructions

### 1. Run Database Migration
Execute the SQL script to create the `site_settings` table:
```sql
-- Run the file: create-site-settings-table.sql
```

This will:
- Create the `site_settings` table
- Set up RLS policies (read for all authenticated users, write for admins)
- Insert default branding settings

### 2. Storage Bucket
The branding images are stored in the existing `course-materials` bucket under the `branding/` folder. No additional setup needed.

## 📋 Features

### Editable Settings
- **Site Name**: Main site title (e.g., "OECS MyPD")
- **Short Name**: Short site name (e.g., "MyPD")
- **Main Logo**: Logo displayed in the navbar
- **Header Logo**: Logo displayed in the header section
- **Homepage Background**: Background image for the homepage hero section
- **Hero Title**: Main title text on homepage
- **Hero Subtitle**: Subtitle text on homepage

## 🔐 Access

### Admin Access
Only users with these roles can edit branding:
- `admin`
- `super_admin`
- `curriculum_designer`

### Navigation
1. Sign in as an admin user
2. Click on your user menu in the navbar
3. Navigate to **"Branding Settings"** under admin options
4. Or go directly to: `/admin/settings/branding`

## 🎯 Usage

### Editing Text Settings
1. Navigate to `/admin/settings/branding`
2. Edit any text field (Site Name, Hero Title, etc.)
3. Click **"Save Settings"**
4. Changes take effect immediately (may need page refresh)

### Uploading Images
1. Click on the image preview or **"Upload Image"** button
2. Select an image file (PNG, JPG, WebP, GIF, SVG)
3. Maximum file size: 5MB
4. The image will automatically upload and update the setting
5. Changes are saved automatically

### Image Recommendations
- **Logo**: 200x64px or similar aspect ratio, PNG with transparency
- **Header Logo**: Similar dimensions, centered design
- **Homepage Background**: 1920x1080px or larger, JPG or WebP for better compression

## 🔧 Technical Details

### API Endpoints
- `GET /api/admin/settings/branding` - Fetch settings (admin only)
- `PUT /api/admin/settings/branding` - Update settings (admin only)
- `POST /api/admin/upload/branding` - Upload branding images (admin only)
- `GET /api/settings/branding` - Public endpoint for frontend (no auth required)

### React Hook
The `useBranding()` hook provides easy access to branding settings:
```typescript
import { useBranding } from '@/lib/hooks/useBranding';

const { 
  siteName, 
  siteShortName, 
  logoUrl, 
  logoHeaderUrl,
  homepageHeaderBackground,
  homepageHeroTitle,
  homepageHeroSubtitle 
} = useBranding();
```

### Caching
- Branding settings are cached for 5 minutes to reduce database queries
- Cache is shared across components using the same hook
- To invalidate cache, use `invalidateCache()` method

### Components Updated
- ✅ `Navbar` - Uses dynamic logo and site name
- ✅ `LogoHeader` - Uses dynamic header logo
- ✅ `Homepage` - Uses dynamic background, title, and subtitle

## 📝 Database Schema

```sql
site_settings (
  id UUID PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE,
  setting_value TEXT,
  setting_type VARCHAR(50),
  description TEXT,
  updated_at TIMESTAMP,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP
)
```

## 🔄 Fallback Behavior
If branding settings cannot be loaded:
- Components fall back to hardcoded default values
- Site continues to function normally
- Admin can still access settings page to fix issues

## 🛠️ Troubleshooting

### Images not loading
- Check Supabase Storage bucket permissions
- Verify `course-materials` bucket exists and is public
- Check image URLs in database are correct

### Settings not saving
- Verify user has admin role
- Check browser console for errors
- Verify RLS policies are correctly set

### Changes not appearing
- Hard refresh the page (Ctrl+F5 / Cmd+Shift+R)
- Clear browser cache
- Check that cache duration hasn't expired (5 minutes)

