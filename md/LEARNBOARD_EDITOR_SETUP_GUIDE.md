# Learnboard Editor Implementation Guide

## 📋 **Overview**

This guide documents the implementation of the **Learnboard Editor** (standalone Tiptap) as an alternative to TinyMCE. Administrators can now choose between the two editors via the admin settings page.

## ✅ **What Was Implemented**

### **1. LearnboardEditor Component** (`app/components/LearnboardEditor.tsx`)
- **Technology**: Built with Tiptap v2.11.7 and React
- **Features**:
  - Full WYSIWYG editing with toolbar
  - Text formatting (bold, italic, underline, strikethrough)
  - Headings (H1, H2, H3)
  - Lists (bullet, numbered)
  - Text alignment (left, center, right, justify)
  - Text color and highlighting
  - Links and images
  - Tables
  - Code blocks
  - Blockquotes
  - Fullscreen mode
  - Read-only mode for content viewing
  - Custom styling matching LearnBoard theme

### **2. TextEditor Abstraction** (`app/components/TextEditor.tsx`)
- Unified component that switches between TinyMCE and Learnboard Editor
- Automatically fetches admin's editor preference from API
- Supports manual editor selection via `editorType` prop
- Caches editor preference for performance
- Provides loading state while fetching preference

### **3. Admin Settings System**

#### **Database Schema** (`create-system-settings-schema.sql`)
- Created `system_settings` table for application-wide settings
- Includes RLS policies (admins only can modify)
- Default editor set to 'tinymce'
- Auto-updates `updated_at` and `updated_by` fields

#### **API Endpoint** (`app/api/admin/settings/editor/route.ts`)
- **GET**: Public endpoint to fetch current editor preference
- **PUT/POST**: Admin-only endpoint to update editor preference
- Validates editor type ('tinymce' or 'learnboard')
- Returns appropriate success/error responses

#### **Admin UI** (`app/admin/settings/page.tsx`)
- Beautiful, card-based interface for selecting editor
- Shows feature comparison between editors
- Real-time save with success/error feedback
- Role-guarded (admin/super_admin only)

### **4. Updated All Editor Usages**
All components using `TinyMCEEditor` have been updated to use `TextEditor`:
- `app/lessons/[id]/edit/page.tsx`
- `app/courses/create/page.tsx`
- `app/courses/[id]/edit/page.tsx`
- `app/assignment/[id]/page.tsx`
- `app/components/LessonViewer.tsx`
- `app/components/LessonDiscussionDetail.tsx`
- `app/components/DiscussionList.tsx`
- `app/components/DiscussionDetail.tsx`
- `app/components/LessonDiscussionList.tsx`
- `app/components/QuestionEditor.tsx`
- `app/test-editor/page.tsx`
- `app/test-auto-resize/page.tsx`

## 🚀 **Setup Instructions**

### **Step 1: Install Dependencies**
Tiptap packages have already been installed. If you need to reinstall:
```bash
npm install @tiptap/react@^2.11.7 @tiptap/starter-kit@^2.11.7 @tiptap/extension-link@^2.11.7 @tiptap/extension-table@^2.11.7 @tiptap/extension-table-row@^2.11.7 @tiptap/extension-table-cell@^2.11.7 @tiptap/extension-table-header@^2.11.7 @tiptap/extension-color@^2.11.7 @tiptap/extension-underline@^2.11.7 @tiptap/extension-highlight@^2.11.7 @tiptap/extension-subscript@^2.11.7 @tiptap/extension-superscript@^2.11.7 @tiptap/extension-placeholder@^2.11.7 @tiptap/extension-character-count@^2.11.7
```

### **Step 2: Run Database Migration**
Execute the SQL schema to create the system settings table:
```bash
# Run this SQL file in your Supabase SQL editor or database client
create-system-settings-schema.sql
```

This will:
- Create the `system_settings` table
- Set default editor to 'tinymce'
- Configure RLS policies
- Create indexes and triggers

### **Step 3: Access Admin Settings**
1. Log in as an admin user
2. Navigate to `/admin/settings`
3. Select your preferred editor:
   - **TinyMCE**: Feature-rich WYSIWYG with extensive plugins
   - **Learnboard Editor**: Modern, extensible Tiptap-based editor
4. Click "Save Editor Preference"

### **Step 4: Verify Implementation**
- All text editors across the application will now use the selected editor
- Content created with either editor is compatible
- Users may need to refresh to see changes

## 🔧 **How It Works**

### **Editor Selection Flow**
1. `TextEditor` component mounts
2. If `editorType="auto"` (default), fetches preference from API
3. API checks `system_settings` table for `editor_type` setting
4. Returns 'tinymce' or 'learnboard'
5. `TextEditor` dynamically loads the selected editor
6. Preference is cached for performance
7. All editor instances use the same preference

### **Caching**
- Editor preference is cached in memory
- Cache is cleared when admin updates preference
- Prevents unnecessary API calls
- Improves page load performance

### **Backward Compatibility**
- All existing content works with both editors
- HTML output is compatible
- No data migration needed
- Existing TinyMCE content displays correctly in Learnboard Editor

## 📊 **Feature Comparison**

| Feature | TinyMCE | Learnboard Editor |
|---------|---------|------------------|
| WYSIWYG Editing | ✅ | ✅ |
| Text Formatting | ✅ | ✅ |
| Headings | ✅ | ✅ |
| Lists | ✅ | ✅ |
| Text Alignment | ✅ | ✅ |
| Colors | ✅ | ✅ |
| Links | ✅ | ✅ |
| Images | ✅ | ✅ |
| Tables | ✅ | ✅ |
| Code Blocks | ✅ | ✅ |
| Blockquotes | ✅ | ✅ |
| Fullscreen | ✅ | ✅ |
| Read-only Mode | ✅ | ✅ |
| **Architecture** | Plugin-based | Extension-based |
| **Modern React** | ⚠️ Older API | ✅ Modern hooks |
| **Customization** | Limited | ✅ Highly extensible |
| **Bundle Size** | Larger | Smaller |

## 🎯 **Usage Examples**

### **Basic Usage (Auto-select based on admin preference)**
```tsx
import TextEditor from '@/app/components/TextEditor';

<TextEditor
  value={content}
  onChange={setContent}
  placeholder="Start typing..."
  height={400}
/>
```

### **Force Specific Editor**
```tsx
<TextEditor
  value={content}
  onChange={setContent}
  editorType="learnboard" // or "tinymce"
/>
```

### **Read-only Mode**
```tsx
<TextEditor
  value={content}
  onChange={() => {}}
  readOnly={true}
/>
```

## 🔒 **Security**

- **Admin-only Settings**: Only admins can update editor preference
- **Public Read Access**: All users can read editor preference (needed for editor selection)
- **RLS Policies**: Database-level security for system settings
- **Role-based Access**: Admin settings page protected by RoleGuard

## 🐛 **Troubleshooting**

### **Editor Not Loading**
- Check browser console for errors
- Verify Tiptap packages are installed
- Ensure database schema is applied

### **Editor Preference Not Updating**
- Clear browser cache
- Check admin settings API endpoint
- Verify admin user has correct role

### **Styling Issues**
- Check CSS classes are applied
- Verify Tailwind CSS is configured
- Check component styles in LearnboardEditor

### **Content Not Saving**
- Verify `onChange` handler is working
- Check API endpoints for content saving
- Review component state management

## 📝 **Future Enhancements**

Potential improvements for future versions:
1. **Per-User Editor Preference**: Allow users to choose their own editor
2. **Editor Plugins Marketplace**: Installable extensions for Learnboard Editor
3. **Collaborative Editing**: Add real-time collaboration (Tiptap + Yjs)
4. **Custom Themes**: Allow admins to customize editor appearance
5. **Editor Analytics**: Track which editor is used more
6. **Import/Export**: Better support for content migration between editors

## 🎓 **Testing**

Test the implementation by:
1. Switching between editors in admin settings
2. Creating content with each editor
3. Viewing content created with the other editor
4. Testing all formatting features
5. Verifying read-only mode works correctly
6. Testing fullscreen mode

## 📚 **References**

- [Tiptap Documentation](https://tiptap.dev/)
- [Tiptap React Guide](https://tiptap.dev/docs/guide/react)
- [Tiptap Extensions](https://tiptap.dev/docs/editor/extensions)

## ✅ **Completion Checklist**

- ✅ Tiptap packages installed
- ✅ LearnboardEditor component created
- ✅ TextEditor abstraction component created
- ✅ Database schema created
- ✅ Admin settings API implemented
- ✅ Admin settings UI created
- ✅ All editor usages updated
- ✅ Caching implemented
- ✅ Documentation created

## 🎉 **Success!**

The Learnboard Editor is now fully integrated and ready to use. Administrators can switch between TinyMCE and Learnboard Editor at any time via the admin settings page, and all users will automatically use the selected editor for all content creation throughout the application.
