# Quiz CSV Import Guide

## Overview

You can now upload quizzes using CSV files! This feature allows you to quickly create quizzes with multiple questions by importing a properly formatted CSV file.

## How to Use

1. Navigate to the Quiz Builder page (when creating a new quiz)
2. Look for the "Import Quiz from CSV" section
3. Click "Choose CSV File" and select your CSV file
4. The quiz will be created automatically with all questions imported

## CSV Format

The CSV file should follow this structure:

### Option 1: Quiz Metadata in First Row (Recommended)

The first row contains quiz metadata, and subsequent rows contain questions:

```csv
title,description,instructions,time_limit,attempts_allowed,points,published,randomize_questions,randomize_answers,show_correct_answers,show_feedback,passing_score
Sample Quiz,This is a sample quiz,Read carefully,30,2,100,true,false,false,true,after_submit,70
question_type,question_text,question_points,option1,option2,option3,option4,correct_answer,feedback_correct,feedback_incorrect
multiple_choice,What is 2 + 2?,1,3,4,5,6,2,Correct!,Incorrect.
true_false,The Earth is round.,1,True,False,,,1,Correct!,Incorrect.
short_answer,What is H2O?,1,,,,,water,Correct!,Incorrect.
```

### Option 2: Questions Only

If you omit the quiz metadata row, default values will be used:

```csv
question_type,question_text,question_points,option1,option2,option3,option4,correct_answer,feedback_correct,feedback_incorrect
multiple_choice,What is 2 + 2?,1,3,4,5,6,2,Correct!,Incorrect.
```

## Column Descriptions

### Quiz Metadata Columns (First Row - Optional)

| Column | Description | Required | Default |
|--------|-------------|----------|---------|
| `title` | Quiz title | No | "Imported Quiz" |
| `description` | Quiz description | No | "" |
| `instructions` | Instructions for students | No | "" |
| `time_limit` | Time limit in minutes | No | null (unlimited) |
| `attempts_allowed` | Number of attempts allowed | No | 1 |
| `points` | Total quiz points | No | 100 |
| `published` | Whether quiz is published | No | false |
| `randomize_questions` | Randomize question order | No | false |
| `randomize_answers` | Randomize answer order | No | false |
| `show_correct_answers` | Show correct answers | No | false |
| `show_feedback` | When to show feedback | No | "after_submit" |
| `passing_score` | Passing score percentage | No | null |
| `due_date` | Due date (ISO format) | No | null |
| `available_from` | Available from date | No | null |
| `available_until` | Available until date | No | null |

### Question Columns (Required)

| Column | Description | Required | Notes |
|--------|-------------|----------|-------|
| `question_type` | Type of question | Yes | See Question Types below |
| `question_text` | The question text | Yes | |
| `question_points` | Points for this question | No | Default: 1 |
| `option1` - `option6` | Answer options | Depends | Required for multiple choice |
| `correct_answer` | Correct answer | Yes | See below for format |
| `case_sensitive` | Case sensitive (true/false) | No | Default: false |
| `feedback_correct` | Feedback for correct answer | No | |
| `feedback_incorrect` | Feedback for incorrect answer | No | |

## Question Types

### Multiple Choice

- **question_type**: `multiple_choice`
- **Required columns**: `question_text`, `option1`, `option2`, `correct_answer`
- **correct_answer format**: 
  - Option number (1, 2, 3, etc.) - refers to option1, option2, option3
  - Or exact text match of an option

**Example:**
```csv
question_type,question_text,question_points,option1,option2,option3,option4,correct_answer,feedback_correct,feedback_incorrect
multiple_choice,What is 2 + 2?,1,3,4,5,6,2,Correct!,Incorrect.
```

### True/False

- **question_type**: `true_false`
- **Required columns**: `question_text`, `correct_answer`
- **correct_answer format**: 
  - `1` or `True` for True
  - `2` or `False` for False
- Options are automatically created as "True" and "False"

**Example:**
```csv
question_type,question_text,question_points,correct_answer,feedback_correct,feedback_incorrect
true_false,The Earth is round.,1,1,Correct!,Incorrect.
```

### Short Answer

- **question_type**: `short_answer`
- **Required columns**: `question_text`, `correct_answer`
- **correct_answer format**: The exact answer text

**Example:**
```csv
question_type,question_text,question_points,correct_answer,case_sensitive,feedback_correct,feedback_incorrect
short_answer,What is the chemical symbol for water?,1,H2O,false,Correct!,Incorrect.
```

## CSV Template

A template CSV file is available for download from the Quiz Builder page. Click "Download template" to get a sample file with the correct format.

## Tips

1. **Use quotes for text with commas**: If your question text or options contain commas, wrap them in quotes:
   ```csv
   "What is 2 + 2, and why?",1,3,4,5,6,2
   ```

2. **Boolean values**: Use `true`/`false` or `1`/`0` for boolean fields

3. **Dates**: Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS) for date fields

4. **Empty fields**: Leave fields empty if not needed (but include the comma)

5. **Multiple correct answers**: For multiple choice, only one correct answer is supported per question

## Error Handling

If there are errors during import:
- The quiz will still be created if at least some questions are valid
- Error messages will show which rows had problems
- Invalid questions will be skipped, but valid ones will be imported

## Limitations

- Maximum file size: 5MB
- Question types supported: `multiple_choice`, `true_false`, `short_answer`
- Essay questions should be created manually
- Matching and fill-in-the-blank questions should be created manually

## Example CSV File

```csv
title,description,instructions,time_limit,attempts_allowed,points,published
Math Quiz,Basic math questions,Answer all questions,15,2,100,true
question_type,question_text,question_points,option1,option2,option3,option4,correct_answer,feedback_correct,feedback_incorrect
multiple_choice,What is 2 + 2?,1,3,4,5,6,2,Correct! 2 + 2 = 4.,Incorrect. The answer is 4.
multiple_choice,What is 5 × 3?,1,10,15,20,25,2,Correct! 5 × 3 = 15.,Incorrect. The answer is 15.
true_false,The square root of 16 is 4.,1,True,False,,,1,Correct!,Incorrect. The square root of 16 is 4.
short_answer,What is 10 ÷ 2?,1,,,,,5,Correct!,Incorrect. The answer is 5.
```

## Support

If you encounter issues with CSV import:
1. Check that your CSV file follows the format above
2. Ensure all required columns are present
3. Verify that question types are spelled correctly
4. Check that correct_answer values match your options

