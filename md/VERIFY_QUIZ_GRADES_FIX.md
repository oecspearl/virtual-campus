# How to Verify the Quiz Grades Fix

This guide will help you verify that the quiz grade points fix is working correctly.

## Method 1: Check the Database Directly

### Step 1: Find a Quiz with Questions
Run this SQL query in your Supabase SQL editor to find a quiz and its total points:

```sql
-- Find a quiz and calculate its total points from questions
SELECT 
    q.id as quiz_id,
    q.title as quiz_title,
    q.points as quiz_points_field,
    COUNT(qu.id) as question_count,
    COALESCE(SUM(qu.points), 0) as calculated_total_points
FROM quizzes q
LEFT JOIN questions qu ON qu.quiz_id = q.id
GROUP BY q.id, q.title, q.points
HAVING COUNT(qu.id) > 0
ORDER BY q.created_at DESC
LIMIT 5;
```

### Step 2: Check the Grade Item Points
Compare the grade item points with the calculated total:

```sql
-- Check if grade item points match calculated total
SELECT 
    cgi.id as grade_item_id,
    cgi.title,
    cgi.points as grade_item_points,
    cgi.assessment_id as quiz_id,
    (SELECT COALESCE(SUM(points), 0) 
     FROM questions 
     WHERE quiz_id = cgi.assessment_id) as calculated_points,
    CASE 
        WHEN cgi.points = (SELECT COALESCE(SUM(points), 0) 
                          FROM questions 
                          WHERE quiz_id = cgi.assessment_id) 
        THEN '✅ MATCH' 
        ELSE '❌ MISMATCH' 
    END as status
FROM course_grade_items cgi
WHERE cgi.type = 'quiz'
  AND cgi.assessment_id IS NOT NULL
ORDER BY cgi.created_at DESC
LIMIT 10;
```

### Step 3: Check if Grades Have Correct max_score
Verify that existing grades have the correct max_score:

```sql
-- Check if grades have correct max_score matching grade item points
SELECT 
    cg.id as grade_id,
    cg.score,
    cg.max_score,
    cg.percentage,
    cgi.points as grade_item_points,
    CASE 
        WHEN cg.max_score = cgi.points THEN '✅ MATCH' 
        ELSE '❌ MISMATCH' 
    END as max_score_status,
    CASE 
        WHEN cgi.points > 0 AND ABS(cg.percentage - (cg.score::numeric / cgi.points * 100)) < 0.01 
        THEN '✅ CORRECT' 
        ELSE '❌ INCORRECT' 
    END as percentage_status
FROM course_grades cg
JOIN course_grade_items cgi ON cgi.id = cg.grade_item_id
WHERE cgi.type = 'quiz'
ORDER BY cg.updated_at DESC
LIMIT 10;
```

## Method 2: Test Through the UI

### Test Scenario 1: View Existing Gradebook
1. **Navigate to a course gradebook:**
   - Go to `/courses/[courseId]/gradebook` (as instructor)
   - Or `/courses/[courseId]` and click "Gradebook" (as student)

2. **Check quiz points:**
   - Look for quizzes in the gradebook
   - Verify the points shown match the sum of question points (not the `quiz.points` field)

3. **Check student grades:**
   - Verify percentages are calculated correctly: `(score / max_score) * 100`
   - Verify max_score matches the grade item points

### Test Scenario 2: Submit a New Quiz
1. **Create or find a quiz with questions:**
   - Create a quiz with multiple questions (e.g., 3 questions worth 5, 10, and 15 points = 30 total)
   - Make sure the quiz is published

2. **Submit the quiz as a student:**
   - Take the quiz and submit it
   - Check the gradebook immediately after submission

3. **Verify:**
   - The grade item should show **30 points** (sum of question points), not the `quiz.points` value
   - The grade should have `max_score: 30`
   - The percentage should be calculated as `(score / 30) * 100`

### Test Scenario 3: Update Quiz Questions
1. **Modify a quiz:**
   - Add or remove questions from an existing quiz
   - Change point values of questions
   - Save the quiz

2. **Check the gradebook:**
   - Refresh the gradebook page
   - The grade item points should automatically update to match the new total
   - Existing grades should have updated `max_score` and recalculated `percentage`

### Test Scenario 4: Check Console Logs
Open your browser's developer console (F12) and look for these log messages:

**When viewing gradebook:**
```
Updating grade item [id] points from [old] to [new] for quiz [quizId]
Updated [count] existing grades for grade item [id] with new max_score [points]
```

**When submitting a quiz:**
```
Updating grade item points from [old] to [new] for quiz [quizId]
Updated [count] existing grades with new max_score [points]
```

## Method 3: Test via API

### Check Gradebook API Response
1. **Open browser console** (F12)
2. **Run this in the console:**
```javascript
// Replace [courseId] with an actual course ID
fetch('/api/courses/[courseId]/gradebook')
  .then(r => r.json())
  .then(data => {
    console.log('Grade Items:', data.items);
    console.log('Grades:', data.grades);
    
    // Check quiz items
    const quizItems = data.items.filter(i => i.type === 'quiz');
    quizItems.forEach(item => {
      console.log(`Quiz "${item.title}": ${item.points} points`);
    });
    
    // Check if grades match
    data.grades.forEach(grade => {
      const item = data.items.find(i => i.id === grade.grade_item_id);
      if (item && item.type === 'quiz') {
        const expectedPercentage = item.points > 0 
          ? (grade.score / item.points * 100).toFixed(2) 
          : 0;
        console.log(`Grade for "${item.title}": score=${grade.score}, max=${grade.max_score}, percentage=${grade.percentage} (expected: ${expectedPercentage})`);
      }
    });
  });
```

## Method 4: Quick Verification Checklist

- [ ] **Database Check:**
  - [ ] Grade item `points` = Sum of question `points` for that quiz
  - [ ] Grade `max_score` = Grade item `points`
  - [ ] Grade `percentage` = `(score / max_score) * 100`

- [ ] **UI Check:**
  - [ ] Gradebook shows correct points for quizzes
  - [ ] Student grades show correct percentages
  - [ ] Total points calculation is correct

- [ ] **Behavior Check:**
  - [ ] New quiz submissions create grade items with correct points
  - [ ] Updating quiz questions updates grade item points
  - [ ] Existing grades are updated when points change

## Troubleshooting

### If points don't match:
1. **Check if questions exist:**
   ```sql
   SELECT COUNT(*), SUM(points) 
   FROM questions 
   WHERE quiz_id = '[your-quiz-id]';
   ```

2. **Manually trigger update:**
   - Submit the quiz again (this will trigger the sync)
   - Or refresh the gradebook page (this triggers auto-update)

3. **Check server logs:**
   - Look for errors in your deployment logs (Heroku logs)
   - Check for console.log messages about point updates

### If grades aren't updating:
1. **Check if the update ran:**
   - Look for console log messages: `"Updated X existing grades with new max_score"`
   - Check the database `updated_at` timestamp on `course_grades`

2. **Force refresh:**
   - Clear browser cache
   - Hard refresh the gradebook page (Ctrl+F5 or Cmd+Shift+R)

## Expected Behavior

✅ **Correct:**
- Quiz with questions worth 5, 10, 15 points → Grade item shows **30 points**
- Student scores 20/30 → Grade shows `max_score: 30`, `percentage: 66.67`
- After adding a 10-point question → Grade item updates to **40 points**, grades recalculate

❌ **Incorrect (before fix):**
- Quiz with questions worth 5, 10, 15 points → Grade item shows **5 points** (from `quiz.points`)
- Student scores 20/30 → Grade shows `max_score: 5`, `percentage: 400` (incorrect)




