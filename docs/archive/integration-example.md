# Video Conferencing Integration Example

## How to integrate video conferencing into your course pages

### 1. Course Page Integration

Add this to your course page (e.g., `app/course/[id]/page.tsx`):

```tsx
import VideoConferenceSection from '@/components/VideoConferenceSection';

// In your course page component:
export default function CoursePage({ params }: { params: { id: string } }) {
  const courseId = params.id;
  const isInstructor = true; // Determine this based on user role

  return (
    <div className="space-y-6">
      {/* Your existing course content */}
      
      {/* Video Conferencing Section */}
      <VideoConferenceSection
        courseId={courseId}
        isInstructor={isInstructor}
      />
    </div>
  );
}
```

### 2. Lesson Page Integration

Add this to your lesson page (e.g., `app/course/[id]/lesson/[lessonId]/page.tsx`):

```tsx
import VideoConferenceSection from '@/components/VideoConferenceSection';

// In your lesson page component:
export default function LessonPage({ 
  params 
}: { 
  params: { id: string; lessonId: string } 
}) {
  const courseId = params.id;
  const lessonId = params.lessonId;
  const isInstructor = true; // Determine this based on user role

  return (
    <div className="space-y-6">
      {/* Your existing lesson content */}
      
      {/* Video Conferencing Section for this specific lesson */}
      <VideoConferenceSection
        courseId={courseId}
        lessonId={lessonId}
        isInstructor={isInstructor}
      />
    </div>
  );
}
```

### 3. Dashboard Integration

Add this to your dashboard to show upcoming conferences:

```tsx
import ConferenceList from '@/components/ConferenceList';

// In your dashboard component:
export default function Dashboard() {
  const [upcomingConferences, setUpcomingConferences] = useState([]);

  return (
    <div className="space-y-6">
      {/* Your existing dashboard content */}
      
      {/* Upcoming Conferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Upcoming Video Conferences
        </h3>
        <ConferenceList
          courseId="all" // or specific course ID
          onJoin={(conference) => {
            // Handle joining conference
            window.open(conference.meeting_url, '_blank');
          }}
          isInstructor={false}
        />
      </div>
    </div>
  );
}
```

## Next Steps

1. **Run the database migration**: Execute `create-video-conferences-schema.sql` in your Supabase dashboard
2. **Test the API endpoints**: Use the provided API routes to create and manage conferences
3. **Integrate components**: Add the VideoConferenceSection to your course and lesson pages
4. **Customize styling**: Adjust the component styles to match your design system
5. **Add notifications**: Implement real-time notifications for conference events

## Features Included

✅ **Database Schema** - Complete with RLS policies
✅ **API Endpoints** - Full CRUD operations for conferences
✅ **VideoConference Component** - Jitsi Meet integration
✅ **ConferenceScheduler Component** - Schedule new meetings
✅ **ConferenceList Component** - Display and manage conferences
✅ **VideoConferenceSection Component** - Easy integration wrapper

## Configuration

The video conferencing uses Jitsi Meet by default. To customize:

1. **Change Jitsi domain**: Update the domain in `VideoConference.tsx`
2. **Custom branding**: Modify the `interfaceConfigOverwrite` in `VideoConference.tsx`
3. **Add authentication**: Implement JWT tokens for secure meetings
4. **Recording storage**: Configure where recordings are stored after meetings
