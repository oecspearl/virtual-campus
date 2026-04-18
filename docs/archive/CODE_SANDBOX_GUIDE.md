# 💻 Code Sandbox/Interactive Code Guide

## Overview
The Code Sandbox feature allows instructors to create interactive coding exercises directly within lessons. Students can write, edit, and execute code in multiple programming languages, making it perfect for programming courses, technical training, and coding exercises.

## Features

### Supported Programming Languages
- **📜 JavaScript** - Execute directly in browser
- **📘 TypeScript** - TypeScript syntax highlighting
- **🌐 HTML/CSS/JS** - Full web page preview with live rendering
- **🐍 Python** - Syntax highlighting (execution requires external environment)
- **☕ Java** - Syntax highlighting (execution requires compiler)
- **⚙️ C++** - Syntax highlighting (execution requires compiler)
- **🗄️ SQL** - SQL query syntax highlighting
- **📋 JSON** - JSON formatting and validation

### Code Execution
- **JavaScript**: Runs directly in the browser with immediate output
- **HTML/CSS/JS**: Renders in an iframe preview panel
- **Other languages**: Display code with instructions for external execution

### Editor Features
- **Syntax highlighting** - Color-coded code for better readability
- **Line numbers** - Track your code structure
- **Code templates** - Pre-filled starter code for each language
- **Reset button** - Quickly restore template code
- **Character/line counter** - Monitor code size
- **Read-only mode** - Display code without allowing edits

### Output Panel
- **Real-time results** - See output immediately after execution
- **Error messages** - Clear error reporting for debugging
- **Console output** - Capture all console.log statements
- **HTML preview** - Live preview for HTML/CSS/JS code

## How to Add a Code Sandbox

### Step 1: Edit Your Lesson
1. Navigate to your lesson
2. Click "Edit Lesson" (instructor access required)

### Step 2: Add Code Sandbox Material
1. Scroll to the "Content Builder" section
2. Click the "Add Material..." dropdown
3. Select "💻 Code Sandbox"

### Step 3: Configure the Code Sandbox

#### Programming Language
- Select the programming language from the dropdown
- Each language has its own syntax highlighting and template

#### Initial Code
- Enter your starter code in the code editor
- This code will be shown to students when they first open the sandbox
- Leave empty to use the default template for the selected language
- The editor supports:
  - Syntax highlighting
  - Tab indentation
  - Multi-line code
  - Copy/paste functionality

#### Instructions (Optional)
- Add learning objectives or exercise instructions
- Explain what students should accomplish
- Provide hints or additional context
- This appears above the code editor

#### Read-Only Mode
- Check this option to display code without allowing edits
- Useful for:
  - Code demonstrations
  - Reference examples
  - Showing solutions
  - Displaying code snippets

### Step 4: Save and Preview
1. Click "Save" to save your lesson
2. View the lesson to see how the code sandbox appears to students
3. Test the code execution to ensure it works as expected

## Best Practices

### For Instructors

#### 1. Start with Templates
- Use the default templates as starting points
- Modify templates to match your learning objectives
- Provide clear, commented code examples

#### 2. Add Clear Instructions
- Explain what the code should do
- Specify expected outcomes
- Provide hints for complex exercises
- Include learning objectives

#### 3. Progressive Complexity
- Start with simple exercises
- Gradually increase difficulty
- Build on previous concepts
- Provide multiple exercises per concept

#### 4. Test Before Publishing
- Run your code to ensure it works
- Check for syntax errors
- Verify output matches expectations
- Test in different browsers

#### 5. Use Read-Only for Examples
- Display reference code without editing
- Show solutions after students attempt
- Provide code snippets for reference
- Demonstrate best practices

### For Students

#### 1. Read Instructions First
- Understand the learning objective
- Review expected outcomes
- Check for hints or requirements

#### 2. Experiment Freely
- Try different approaches
- Test edge cases
- Make mistakes and learn from them
- Use the reset button if needed

#### 3. Check Output
- Review console output carefully
- Read error messages thoroughly
- Understand what the code produces
- Verify results match expectations

#### 4. Learn from Errors
- Read error messages carefully
- Understand what went wrong
- Fix issues systematically
- Don't be afraid to ask for help

## Use Cases

### Programming Courses
- **JavaScript fundamentals** - Variables, functions, loops
- **Algorithm practice** - Sorting, searching, data structures
- **Object-oriented programming** - Classes, inheritance, polymorphism
- **Web development** - HTML/CSS layout, DOM manipulation

### Technical Training
- **SQL queries** - Database operations, joins, aggregations
- **Data manipulation** - JSON parsing, data transformation
- **API concepts** - Understanding request/response patterns
- **Code reviews** - Analyzing and improving code

### Coding Exercises
- **Problem-solving** - Algorithms and data structures
- **Code challenges** - Competitive programming practice
- **Debugging exercises** - Finding and fixing errors
- **Refactoring** - Improving code quality

### Demonstrations
- **Live coding** - Show concepts in action
- **Code examples** - Reference implementations
- **Best practices** - Demonstrating patterns
- **Common mistakes** - Learning from errors

## Technical Details

### Execution Environment

#### JavaScript Execution
- Executes in browser using `new Function()`
- Captures console.log and console.error
- Safe execution context (limited scope)
- No access to browser APIs for security

#### HTML/CSS/JS Execution
- Renders in sandboxed iframe
- Full HTML page rendering
- CSS styling support
- JavaScript execution within iframe
- Isolated from main page for security

#### Other Languages
- Syntax highlighting only
- Code displayed with execution instructions
- Students can copy code for external execution
- Recommended external tools:
  - Python: repl.it, Python.org shell
  - Java/C++: IDE like IntelliJ, VS Code, or online compilers

### Security Considerations
- JavaScript execution is sandboxed
- HTML/CSS rendered in isolated iframe
- No access to sensitive browser APIs
- Code cannot access parent page data
- Safe for educational use

### Limitations
- **JavaScript**: Limited to basic execution (no Node.js APIs)
- **Python/Java/C++**: Display only, requires external execution
- **Browser compatibility**: Works in modern browsers (Chrome, Firefox, Safari, Edge)
- **Performance**: Large code files may be slower to render

## Troubleshooting

### Code Not Executing
- **Check syntax** - Ensure code is valid
- **Review errors** - Check the output panel for error messages
- **Browser console** - Open browser DevTools for detailed errors
- **Language support** - Verify JavaScript execution (other languages require external tools)

### Output Not Showing
- **Check console.log** - Ensure you're using console.log for output
- **Review output panel** - Scroll down to see all output
- **Clear and retry** - Use the "Clear" button and run again

### HTML Preview Not Working
- **Check HTML structure** - Ensure valid HTML (DOCTYPE, html, head, body)
- **Verify iframe** - Check browser console for iframe errors
- **Test in different browser** - Some browsers have iframe restrictions

### Code Editor Issues
- **Refresh page** - Reload the lesson page
- **Check browser** - Ensure modern browser is being used
- **Clear cache** - Clear browser cache and cookies

## Future Enhancements

Potential future improvements:
- **Monaco Editor integration** - Full VS Code editor experience
- **Server-side execution** - Python, Java, C++ execution via API
- **Code sharing** - Share code between students
- **Auto-grading** - Automatic code evaluation
- **Multi-file support** - Multiple code files per exercise
- **Version history** - Track code changes over time
- **Collaborative editing** - Real-time code collaboration

## Support

For issues or questions:
1. Check this guide for common solutions
2. Review browser console for errors
3. Test in different browsers
4. Contact your instructor or system administrator

---

**Note**: The Code Sandbox feature is designed for educational use. For production code or complex applications, use dedicated development environments.

