# Quiz Submission Fix

## Problem
Quiz submission was failing with a 400 error because the quiz attempt creation was trying to get a `course_id` but the quiz wasn't properly associated with a course.

## Root Cause
The original fix assumed the wrong relationship chain. In the actual database schema:
- Quizzes have `lesson_id` (optional)
- Lessons have `course_id` (direct relationship)

## Solution Applied

### 1. Updated Quiz Attempt Creation (`app/api/quizzes/[id]/attempts/route.ts`)
- Modified the query to follow the proper relationship chain: `quiz -> lesson -> course`
- Added fallback to check for direct `course_id` on quiz (if column exists)
- Improved error messaging to help identify the issue

### 2. Database Schema Fix (`fix-quiz-course-linking-complete.sql`)
- Created a comprehensive SQL script to:
  - Add `course_id` column to quizzes table if it doesn't exist
  - Update existing quizzes to have `course_id` based on their lesson's course
  - Create necessary indexes
  - Provide debugging information

### 3. Debug Endpoint (`app/api/debug/quiz-course/route.ts`)
- Created a debug endpoint to check quiz course associations
- Helps identify if quizzes are properly linked to courses

## How to Fix

### Step 1: Run the Database Fix
Execute the SQL script to ensure proper database schema:
```sql
-- Run the contents of fix-quiz-course-linking-complete.sql
```

### Step 2: Test Quiz Submission
1. Try to start a quiz attempt
2. If it still fails, use the debug endpoint to check the quiz's course association:
   ```
   GET /api/debug/quiz-course?quizId=YOUR_QUIZ_ID
   ```

### Step 3: Verify Course Association
The debug endpoint will show:
- Quiz details
- Lesson details (if any)
- Subject details (if any)
- Resolved course_id

## Expected Behavior After Fix

1. **Quiz Attempt Creation**: Should work for quizzes properly linked to courses
2. **Course Association**: Quizzes should have `course_id` populated
3. **Gradebook Integration**: Quiz grades should automatically sync to gradebook
4. **Error Messages**: Clear error messages if quiz isn't associated with a course

## Troubleshooting

### If Quiz Still Fails to Submit:
1. Check if the quiz has a `lesson_id`
2. Check if the lesson has a `subject_id`
3. Check if the subject has a `course_id`
4. Use the debug endpoint to see the full relationship chain

### If No Course Association:
- The quiz might be a standalone quiz not linked to any lesson
- You may need to manually assign a `course_id` to the quiz
- Or link the quiz to a lesson that belongs to a course

## Files Modified
- `app/api/quizzes/[id]/attempts/route.ts` - Fixed course_id resolution
- `fix-quiz-course-linking-complete.sql` - Database schema fix
- `app/api/debug/quiz-course/route.ts` - Debug endpoint

## Testing
1. Run the database fix script
2. Try to start a quiz attempt
3. If it fails, check the debug endpoint
4. Verify the quiz is properly associated with a course
5. Test quiz submission and gradebook integration
