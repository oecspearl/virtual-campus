# 🎬 Interactive Video Guide

## Overview

Interactive Video is a powerful content type that allows you to embed questions directly into video lessons. When students watch the video, it automatically pauses at specified timestamps, presents questions, and provides immediate feedback.

## ✨ Key Features

- **Automatic Pause**: Video pauses at checkpoints you define
- **Multiple Question Types**: Multiple choice, True/False, or Short answer
- **Immediate Feedback**: Students see if their answer was correct/incorrect
- **Progress Tracking**: Visual indicators show which checkpoints have been completed
- **Flexible Video Sources**: Works with uploaded video files or YouTube/Vimeo URLs

## 🎯 When to Use Interactive Video

Interactive videos are perfect for:
- **Step-by-step tutorials** with knowledge checks
- **Case studies** with decision points
- **Safety training** with comprehension checks
- **Story-based learning** with interactive choices
- **Lecture videos** with reflection moments

## 📝 How to Create an Interactive Video

### Step 1: Add Interactive Video Content

1. Go to your lesson edit page (`/lessons/[id]/edit`)
2. Scroll to the "Content Builder" section
3. Click "Add Material..." dropdown
4. Select "🎬 Interactive Video"

### Step 2: Add Video Source

You have two options:

#### Option A: Upload Video File (Recommended)
- Click "Choose or Drop a file" to upload a video
- Supported formats: MP4, WebM, MOV
- Maximum size: 50MB
- **Best for**: Full control over checkpoints and timing

#### Option B: Use Video URL
- Enter a YouTube or Vimeo URL
- Note: Checkpoint control is limited with external videos
- **Best for**: Quick setup with existing videos

### Step 3: Add Checkpoints

1. Click the **"+ Add Checkpoint"** button
2. Configure each checkpoint:

#### Required Fields:
- **Timestamp (seconds)**: When in the video the question should appear
  - Example: `30` = 30 seconds into the video
  - Example: `120` = 2 minutes into the video
- **Question Text**: The question you want to ask
- **Question Type**: Choose from:
  - Multiple Choice
  - True/False
  - Short Answer

#### For Multiple Choice Questions:
- Add multiple options (minimum 2)
- Mark one option as "Correct"
- Students select from the options

#### For True/False Questions:
- Set the correct answer (True or False)
- Students select True or False

#### For Short Answer Questions:
- Enter the correct answer text
- Students type their answer (case-sensitive matching)

#### Optional Fields:
- **Feedback**: Text shown after answering (e.g., "Great job!" or "Remember that...")
- **Points**: Points awarded for correct answer (default: 1)

### Step 4: Preview and Test

1. Save your lesson
2. View the lesson as a student
3. Play the video and verify checkpoints trigger at the right times
4. Test answering questions and receiving feedback

## 🎨 Student Experience

### Watching the Video

1. **Video plays normally** until reaching a checkpoint
2. **Video automatically pauses** at the checkpoint timestamp
3. **Question appears** below/overlay on the video
4. **Student answers** the question
5. **Feedback is shown** immediately (correct/incorrect + optional feedback)
6. **Student clicks "Continue Video"** to resume playback
7. **Process repeats** for each checkpoint

### Visual Indicators

- **Checkpoint markers** show when questions appear
- **Progress indicators** show which checkpoints have been completed
- **Color coding**: Green for correct, Red for incorrect

## 💡 Best Practices

### Timestamp Planning

1. **Watch your video first** and note important moments
2. **Place checkpoints** at natural pause points:
   - After explaining a concept
   - Before introducing new information
   - At the end of key sections
3. **Space checkpoints** appropriately (not too close together)

### Question Design

1. **Keep questions clear and concise**
2. **Focus on key concepts** from that section of the video
3. **Use feedback** to reinforce learning or clarify misunderstandings
4. **Vary question types** to keep students engaged

### Multiple Choice Tips

- Provide 2-4 options (not too many)
- Make distractors plausible but clearly wrong
- Keep option text short and clear

### Short Answer Tips

- Use for recall questions
- Be specific about expected format (e.g., "Enter one word")
- Consider common misspellings

## 🔧 Technical Details

### Data Structure

Checkpoints are stored in the lesson content JSON:

```json
{
  "type": "interactive_video",
  "title": "Introduction to Algebra",
  "data": {
    "videoUrl": "https://...",
    "fileId": "uuid",
    "checkpoints": [
      {
        "id": "cp-1234567890",
        "timestamp": 30,
        "questionText": "What is 2 + 2?",
        "questionType": "multiple_choice",
        "options": [
          { "id": "opt-1", "text": "3", "isCorrect": false },
          { "id": "opt-2", "text": "4", "isCorrect": true },
          { "id": "opt-3", "text": "5", "isCorrect": false }
        ],
        "correctAnswer": "opt-2",
        "feedback": "Correct! 2 + 2 = 4",
        "points": 1
      }
    ]
  }
}
```

### Video Format Support

- **Uploaded videos**: MP4, WebM, MOV (best experience)
- **External URLs**: YouTube, Vimeo (limited control)

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- HTML5 video support required
- JavaScript must be enabled

## ❓ Troubleshooting

### Checkpoints Not Triggering

- **Check timestamp**: Ensure timestamp is in seconds (not minutes)
- **Verify video loaded**: Make sure video plays normally first
- **Check format**: Uploaded videos work better than external URLs

### Questions Not Showing

- **Verify checkpoint data**: Check that question text and options are filled
- **Check browser console**: Look for JavaScript errors
- **Try refreshing**: Reload the page

### Video Won't Play

- **Check file format**: Ensure video is MP4, WebM, or MOV
- **Verify file size**: Must be under 50MB
- **Check URL**: If using external URL, ensure it's valid

### YouTube/Vimeo Limitations

- **Limited control**: External videos can't pause precisely
- **Workaround**: Checkpoints are shown as a list below the video
- **Recommendation**: Upload video files for best experience

## 📊 Example Use Cases

### Use Case 1: Math Tutorial

- **Checkpoint at 1:00**: "What is the first step in solving this equation?"
- **Checkpoint at 2:30**: "What is the answer to 5 × 3?"
- **Checkpoint at 4:00**: "True or False: You always solve parentheses first"

### Use Case 2: Safety Training

- **Checkpoint at 0:45**: "What should you do first in an emergency?"
- **Checkpoint at 2:15**: "True or False: You should run during a fire drill"
- **Checkpoint at 3:30**: "Where is the nearest emergency exit?"

### Use Case 3: Language Learning

- **Checkpoint at 0:30**: "What does 'bonjour' mean?"
- **Checkpoint at 1:45**: "True or False: 'Merci' means 'please'"
- **Checkpoint at 3:00**: "How do you say 'thank you' in French?"

## 🎉 Success Tips

1. **Start simple**: Add 2-3 checkpoints to test
2. **Get feedback**: Ask students if timing is appropriate
3. **Refine**: Adjust timestamps and questions based on usage
4. **Mix it up**: Combine with other content types (text, images, quizzes)

---

**Interactive Video makes learning more engaging and helps ensure students are paying attention and understanding the material!** 🎬✨

