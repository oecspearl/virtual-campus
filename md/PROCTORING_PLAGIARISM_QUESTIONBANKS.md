# Proctoring, Plagiarism Detection, and Question Banks Implementation

This document describes the implementation of three advanced assessment features:

1. **Proctoring Integration** - Browser locking and remote proctoring
2. **Plagiarism Detection** - Turnitin/Unicheck integration via LTI
3. **Question Banks** - Shared question repositories

## 📋 Database Schema

Run the migration file to create all necessary tables:

```sql
-- Run in Supabase SQL Editor
\i database/proctoring-plagiarism-questionbanks-schema.sql
```

### Tables Created:

**Proctoring:**
- `proctoring_sessions` - Tracks proctoring sessions
- `proctoring_events` - Logs all events during sessions
- `proctoring_services` - Configuration for proctoring services

**Plagiarism:**
- `plagiarism_checks` - Tracks plagiarism checks
- `plagiarism_services` - Configuration for plagiarism services

**Question Banks:**
- `question_banks` - Shared question repositories
- `question_bank_questions` - Questions in banks
- `question_bank_access` - Access control
- `question_bank_usage` - Usage tracking

## 🔒 Proctoring Integration

### Browser Locking

The browser locking feature prevents cheating by:
- Preventing copy/paste
- Preventing new tabs/windows
- Preventing printing
- Monitoring tab switches
- Detecting dev tools
- Requiring fullscreen mode

### Usage Example

```typescript
import { createBrowserLock } from '@/lib/proctoring/browser-lock';

// Create browser lock
const browserLock = createBrowserLock({
  preventCopyPaste: true,
  preventNewTabs: true,
  preventPrinting: true,
  preventScreenCapture: true,
  requireFullscreen: true,
  allowSwitchingTabs: false,
  maxTabSwitches: 0,
  onViolation: (violation) => {
    // Record violation
    fetch('/api/proctoring/event', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        event_type: violation.type,
        severity: violation.severity,
        metadata: violation.metadata,
      }),
    });
  },
});

// Start locking
browserLock.start();

// Stop locking (when quiz is submitted)
browserLock.stop();
```

### API Endpoints

**Create Proctoring Session:**
```
POST /api/proctoring/session
{
  "quiz_id": "uuid",
  "course_id": "uuid",
  "session_type": "browser_lock",
  "browser_lock_config": {
    "prevent_copy_paste": true,
    "prevent_new_tabs": true,
    "require_fullscreen": true
  }
}
```

**Record Event:**
```
POST /api/proctoring/event
{
  "session_id": "uuid",
  "event_type": "tab_switch",
  "severity": "high",
  "metadata": {}
}
```

**Get Session:**
```
GET /api/proctoring/session?session_id=uuid
```

**End Session:**
```
PUT /api/proctoring/session
{
  "session_id": "uuid",
  "action": "end"
}
```

### Remote Proctoring Services

The system supports integration with:
- **Respondus LockDown Browser**
- **ProctorU**
- **ProctorExam**
- **Custom services**

Configure services in the `proctoring_services` table.

## 📝 Plagiarism Detection

### Turnitin Integration (via LTI)

Since you already have LTI 1.3 implemented, Turnitin can be integrated:

1. **Register Turnitin as LTI Tool:**
   - Go to `/admin/lti-tools`
   - Add Turnitin with their LTI configuration
   - Get client_id, launch_url, etc. from Turnitin

2. **Initiate Plagiarism Check:**
```typescript
const response = await fetch('/api/plagiarism/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    submission_id: submissionId,
    assignment_id: assignmentId,
    course_id: courseId,
    file_url: fileUrl,
    title: 'Assignment Submission'
  })
});
```

3. **Get Results:**
```typescript
const response = await fetch(`/api/plagiarism/check?submission_id=${submissionId}`);
const check = await response.json();

console.log('Similarity Score:', check.similarity_score);
console.log('Report URL:', check.report_url);
```

### API Endpoints

**Initiate Check:**
```
POST /api/plagiarism/check
{
  "submission_id": "uuid",
  "assignment_id": "uuid",
  "course_id": "uuid",
  "file_url": "https://...",
  "title": "Assignment"
}
```

**Get Check Results:**
```
GET /api/plagiarism/check?check_id=uuid
GET /api/plagiarism/check?submission_id=uuid
```

### Supported Services

- **Turnitin** (via LTI)
- **Unicheck** (via LTI or API)
- **Copyscape** (via API)
- **Custom services**

## 📚 Question Banks

### Creating a Question Bank

```typescript
const response = await fetch('/api/question-banks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Mathematics 101 Questions',
    description: 'Questions for introductory mathematics',
    access_level: 'shared', // 'private', 'shared', 'public'
    subject_area: 'Mathematics',
    grade_level: 'Undergraduate',
    tags: ['algebra', 'calculus', 'trigonometry']
  })
});
```

### Adding Questions to Bank

```typescript
const response = await fetch(`/api/question-banks/${bankId}/questions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'multiple_choice',
    question_text: 'What is 2 + 2?',
    points: 1,
    options: {
      choices: ['3', '4', '5', '6']
    },
    correct_answer: {
      answer: '4'
    },
    difficulty: 'easy',
    subject_area: 'Mathematics',
    tags: ['arithmetic', 'basic'],
    bloom_taxonomy_level: 'remember'
  })
});
```

### Using Questions from Bank in Quiz

1. Browse question banks
2. Select questions
3. Add to quiz (questions are copied to quiz)

### API Endpoints

**List Question Banks:**
```
GET /api/question-banks?access_level=public&subject_area=Mathematics
```

**Get Bank Questions:**
```
GET /api/question-banks/{bank_id}/questions?type=multiple_choice&difficulty=easy
```

**Create Question Bank:**
```
POST /api/question-banks
{
  "name": "Bank Name",
  "description": "Description",
  "access_level": "shared",
  "subject_area": "Mathematics",
  "tags": ["tag1", "tag2"]
}
```

**Add Question to Bank:**
```
POST /api/question-banks/{bank_id}/questions
{
  "type": "multiple_choice",
  "question_text": "Question text",
  "options": {...},
  "correct_answer": {...}
}
```

## 🎯 Features

### Proctoring Features:
✅ Browser locking (copy/paste, new tabs, printing)
✅ Tab switch monitoring
✅ Dev tools detection
✅ Fullscreen enforcement
✅ Violation tracking
✅ Remote proctoring service integration hooks
✅ AI proctoring support
✅ Human review workflow

### Plagiarism Features:
✅ Turnitin integration via LTI
✅ Similarity score tracking
✅ Report URL storage
✅ Match source tracking
✅ Review workflow
✅ Action tracking (warning, penalty, etc.)

### Question Bank Features:
✅ Shared question repositories
✅ Access control (private, shared, public)
✅ Question tagging and categorization
✅ Difficulty levels
✅ Bloom's taxonomy levels
✅ Usage tracking
✅ Search and filter
✅ Reuse across courses

## 🔐 Security

- Row-Level Security (RLS) on all tables
- Access control for question banks
- Proctoring session access restrictions
- Plagiarism check privacy controls

## 📊 Usage Statistics

Question banks track:
- Usage count per question
- Average scores
- Discrimination index
- Difficulty index

## 🚀 Next Steps

1. **Run Database Migration**: Execute `database/proctoring-plagiarism-questionbanks-schema.sql`
2. **Configure Proctoring Services**: Add service configurations
3. **Register Turnitin**: Add Turnitin as LTI tool
4. **Create Question Banks**: Start building shared question repositories
5. **Integrate in Quiz/Assignment Pages**: Add proctoring and plagiarism checks

## 📖 Integration Examples

### Add Proctoring to Quiz Page

```typescript
// In your quiz page component
useEffect(() => {
  if (quizRequiresProctoring) {
    // Create proctoring session
    const createSession = async () => {
      const response = await fetch('/api/proctoring/session', {
        method: 'POST',
        body: JSON.stringify({
          quiz_id: quizId,
          course_id: courseId,
          session_type: 'browser_lock',
          browser_lock_config: {
            prevent_copy_paste: true,
            prevent_new_tabs: true,
            require_fullscreen: true,
          }
        })
      });
      
      const { session_id } = await response.json();
      
      // Start browser lock
      const browserLock = createBrowserLock({...});
      browserLock.start();
    };
    
    createSession();
  }
}, []);
```

### Add Plagiarism Check to Assignment

```typescript
// When student submits assignment
const checkPlagiarism = async (submissionId: string) => {
  const response = await fetch('/api/plagiarism/check', {
    method: 'POST',
    body: JSON.stringify({
      submission_id: submissionId,
      assignment_id: assignmentId,
      course_id: courseId,
      file_url: fileUrl,
    })
  });
  
  // Check will be processed and results stored
};
```

## 🐛 Troubleshooting

### Browser Lock Not Working
- Check browser permissions
- Some features require HTTPS
- Fullscreen requires user interaction

### Plagiarism Check Fails
- Verify Turnitin LTI tool is configured
- Check file URL is accessible
- Verify LTI credentials

### Question Bank Access Denied
- Check access_level setting
- Verify user has write access
- Check question_bank_access table

## 📝 Notes

- Browser locking has limitations - determined students can bypass some restrictions
- Plagiarism detection requires active LTI tool registration
- Question banks support multi-tenant organizations
- All features include audit logging

