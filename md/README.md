# OECS LearnBoard

A modern Learning Management System for the Organisation of Eastern Caribbean States (OECS), designed to empower education across the Caribbean region.

## 🎨 Visual Design

The application features a clean, modern design with:

- **Dark Navigation**: Professional black/dark grey header with OECS branding
- **Vibrant Accents**: Red (#e74c3c), Orange (#f39c12), and Blue (#3498db) for interactive elements
- **Generous Whitespace**: Clean, uncluttered layout with proper spacing
- **Grid-Based Design**: Responsive layouts for features, courses, and testimonials
- **Educational Imagery**: Professional photos and visual elements

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with role-based access control
- **Styling**: Tailwind CSS with custom CSS variables
- **Animations**: Framer Motion for smooth interactions

## 🚀 Features

### For Students
- Course enrollment and progress tracking
- Assignment submissions and grade viewing
- Quiz attempts with instant feedback
- Personal dashboard and learning analytics
- Gamification (XP, Levels, Streaks) widget on dashboard

### For Instructors
- Course creation and management
- Assignment and quiz creation tools
- Gradebook management
- Student progress monitoring
- Class roster management

### For Administrators
- User management and role assignment
- System-wide analytics and reporting
- Content moderation and approval
- Platform configuration and settings

### New (MVP) Gamification
- Event-driven XP awards for key actions (daily login, lesson complete, quiz attempt/pass, assignment submit, discussion post)
- Server APIs:
  - `POST /api/gamification/events` to record events and award XP
  - `GET /api/gamification/profile` for XP/Level/Streak
- UI: `GamificationWidget` on student dashboard (shows Level, total XP, day streak and progress to next level)

## 🛠️ Technical Notes

### Hydration Warning Fix
The application includes `suppressHydrationWarning={true}` on the body element to prevent hydration mismatches caused by browser extensions (like Grammarly) that modify the DOM after server-side rendering.
### Learnboard Editor Improvements
- Image upload: drag/drop, paste, and file picker now upload via `/api/media/upload` with robust error handling and base64 fallback
- Toolbar reorganized into multiple rows (no horizontal scrolling)
- Safer command execution, better placeholder handling, and improved link/image dialogs

### Navbar Logo Reliability
- The nav logo now uses a static import with `next/image` to prevent intermittent load issues

### Gamification Setup
1. Run `create-gamification-schema.sql` in Supabase (creates `gamification_profiles`, `gamification_xp_ledger` and RLS)
2. Ensure `course-materials` storage bucket exists and is public (image uploads)
3. Emit events from client or server:
   - Example: `fetch('/api/gamification/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType: 'lesson_completed', lessonId }) })`
4. The dashboard automatically displays current XP/Level/Streak via `GamificationWidget`


### Browser Compatibility
- Modern browsers with ES6+ support
- Responsive design for mobile, tablet, and desktop
- Progressive enhancement for accessibility

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly navigation
- Optimized images and assets

## 🎯 OECS Branding

- Official OECS logo integration
- Caribbean-focused content and imagery
- Regional educational standards compliance
- Multi-island accessibility considerations

## 🔧 Development

Built with modern web technologies and best practices:
- TypeScript for type safety
- Server-side rendering for performance
- Client-side hydration for interactivity
- Component-based architecture
- Custom CSS variables for theming

---

**OECS LearnBoard** - Empowering education across the Caribbean region.























