# Help System Documentation

## Overview

The OECS Learning Management System includes a comprehensive help system designed to assist users with all aspects of the platform. The help system consists of multiple components that can be used throughout the application to provide contextual assistance and comprehensive documentation.

## Components

### 1. HelpSystem Component (`app/components/HelpSystem.tsx`)

The main help modal component that displays comprehensive help content.

**Features:**
- Searchable help topics
- Role-based content (different content for students vs instructors)
- Expandable sections
- Responsive design
- Keyboard navigation support

**Props:**
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Close handler
- `userRole?: string` - User role for role-specific content

### 2. HelpButton Component (`app/components/HelpButton.tsx`)

A floating help button that opens the help system.

**Features:**
- Fixed or inline positioning
- Multiple sizes (sm, md, lg)
- Smooth animations
- Accessible design

**Props:**
- `userRole?: string` - User role
- `className?: string` - Additional CSS classes
- `position?: 'fixed' | 'inline'` - Button positioning
- `size?: 'sm' | 'md' | 'lg'` - Button size

### 3. HelpTooltip Component (`app/components/HelpTooltip.tsx`)

Contextual help tooltips for specific UI elements.

**Features:**
- Multiple positioning options (top, bottom, left, right)
- Rich content support (HTML/JSX)
- Auto-positioning to stay in viewport
- Click to dismiss
- Hover/focus triggers

**Props:**
- `content: React.ReactNode` - Tooltip content
- `title?: string` - Tooltip title
- `position?: 'top' | 'bottom' | 'left' | 'right'` - Tooltip position
- `className?: string` - Additional CSS classes
- `children?: React.ReactNode` - Trigger element

### 4. HelpContext Provider (`app/components/HelpContext.tsx`)

Global state management for the help system.

**Features:**
- Global help state
- Programmatic help opening
- User role management
- Context-based help

**Usage:**
```tsx
import { useHelp } from '@/app/components/HelpContext';

function MyComponent() {
  const { openHelp, closeHelp, isHelpOpen } = useHelp();
  
  return (
    <button onClick={() => openHelp('getting-started')}>
      Open Help
    </button>
  );
}
```

## Help Content Sections

### Student Sections
1. **Getting Started** - Basic platform introduction
2. **Navigation & Interface** - UI overview and navigation
3. **Courses & Learning** - Course features and content
4. **Video Conferences** - Joining and participating in meetings
5. **Assignments & Quizzes** - Submitting work and taking tests
6. **Discussions & Communication** - Participating in discussions
7. **Troubleshooting** - Common issues and solutions

### Instructor Sections (Additional)
8. **Instructor Features** - Course management and content creation tools
   - Course Management
   - Content Creation (12 content types)
   - Grading & Feedback
   - Video Conferences
   - **Lecturer Collaboration** (NEW)
     - Lecturer Forums - Discussion forums for sharing ideas and best practices
     - Resource Sharing Hub - Upload, browse, rate, and download educational resources
     - Virtual Staff Room - Real-time chat for instant communication

## Integration

### 1. Global Integration

The help system is integrated globally through the main layout:

```tsx
// app/layout.tsx
import { HelpProvider } from "@/app/components/HelpContext";
import HelpButton from "@/app/components/HelpButton";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SupabaseProvider>
          <HelpProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
            <HelpButton />
          </HelpProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
```

### 2. Navigation Integration

Help link added to main navigation:

```tsx
// app/components/Navbar.tsx
<Link href="/help" className="nav-link">Help</Link>
```

### 3. Direct Help Page

Standalone help page accessible at `/help`:

```tsx
// app/help/page.tsx
export default function HelpPage() {
  // Full help page implementation
}
```

## Usage Examples

### Basic Help Button
```tsx
import HelpButton from '@/app/components/HelpButton';

<HelpButton userRole="student" />
```

### Contextual Help Tooltip
```tsx
import HelpTooltip from '@/app/components/HelpTooltip';

<div className="flex items-center space-x-2">
  <span>What is this?</span>
  <HelpTooltip 
    content="This is a helpful explanation."
    title="Feature Help"
  />
</div>
```

### Programmatic Help Opening
```tsx
import { useHelp } from '@/app/components/HelpContext';

function MyComponent() {
  const { openHelp } = useHelp();
  
  return (
    <button onClick={() => openHelp('troubleshooting')}>
      Get Help
    </button>
  );
}
```

### Rich Content Tooltip
```tsx
<HelpTooltip 
  content={
    <div>
      <p className="font-medium">Steps to complete:</p>
      <ol className="list-decimal list-inside mt-2 space-y-1">
        <li>First step</li>
        <li>Second step</li>
        <li>Final step</li>
      </ol>
    </div>
  }
  title="Instructions"
  position="right"
/>
```

## Customization

### Adding New Help Sections

1. Add new section to `helpSections` array in `HelpSystem.tsx`
2. Include role-specific content if needed
3. Add search keywords for better discoverability

### Styling

All components use Tailwind CSS classes and can be customized:
- Colors: Blue theme by default
- Sizing: Responsive design
- Animations: Smooth transitions
- Accessibility: ARIA labels and keyboard navigation

### Content Management

Help content is managed in the component files:
- Main content: `app/components/HelpSystem.tsx`
- Page content: `app/help/page.tsx`
- Both support JSX for rich formatting

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: ARIA labels and descriptions
- **High Contrast**: Clear visual indicators
- **Focus Management**: Proper focus handling
- **Semantic HTML**: Proper heading structure

## Performance Considerations

- **Lazy Loading**: Help content loads only when needed
- **Memoization**: Components are optimized for re-renders
- **Bundle Size**: Minimal impact on main bundle
- **Caching**: Help content is cached in memory

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile**: Responsive design for all screen sizes
- **Accessibility**: WCAG 2.1 AA compliant

## Future Enhancements

- **Video Tutorials**: Embedded video content
- **Interactive Guides**: Step-by-step walkthroughs
- **User Feedback**: Help content rating system
- **Analytics**: Track help usage patterns
- **Multi-language**: Internationalization support
- **Search Improvements**: Advanced search with filters
- **Help Articles**: External knowledge base integration

## Troubleshooting

### Common Issues

1. **Help not opening**: Check if HelpProvider is properly wrapped
2. **Tooltip positioning**: Verify viewport space and positioning
3. **Content not loading**: Check user role and API responses
4. **Styling issues**: Verify Tailwind CSS is properly configured

### Debug Mode

Enable debug logging by adding console logs in components:
```tsx
console.log('Help system state:', { isOpen, userRole });
```

## Support

For technical support or feature requests related to the help system, contact the development team or create an issue in the project repository.
