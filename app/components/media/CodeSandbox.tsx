'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CodeSandboxProps {
  title?: string;
  language?: string;
  initialCode?: string;
  template?: string;
  instructions?: string;
  readOnly?: boolean;
}

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', icon: '📜' },
  { value: 'typescript', label: 'TypeScript', icon: '📘' },
  { value: 'html', label: 'HTML/CSS/JS', icon: '🌐' },
  { value: 'python', label: 'Python', icon: '🐍' },
  { value: 'java', label: 'Java', icon: '☕' },
  { value: 'cpp', label: 'C++', icon: '⚙️' },
  { value: 'sql', label: 'SQL', icon: '🗄️' },
  { value: 'json', label: 'JSON', icon: '📋' },
];

const CODE_TEMPLATES: Record<string, string> = {
  javascript: `// Write your JavaScript code here
console.log("Hello, World!");

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("Learner"));`,
  typescript: `// Write your TypeScript code here
function add(a: number, b: number): number {
  return a + b;
}

console.log(add(5, 3));`,
  html: `<!DOCTYPE html>
<html>
<head>
  <title>My Code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
    }
    h1 {
      color: #3B82F6;
    }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <p>Edit this HTML to see changes in the preview.</p>
  <script>
    console.log("JavaScript is working!");
  </script>
</body>
</html>`,
  python: `# Write your Python code here
def greet(name):
    return f"Hello, {name}!"

print(greet("Learner"))

# Calculate the sum of numbers
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
print(f"Sum: {total}")`,
  java: `// Write your Java code here
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        int sum = add(5, 3);
        System.out.println("Sum: " + sum);
    }
    
    public static int add(int a, int b) {
        return a + b;
    }
}`,
  cpp: `// Write your C++ code here
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    
    int sum = add(5, 3);
    cout << "Sum: " << sum << endl;
    
    return 0;
}

int add(int a, int b) {
    return a + b;
}`,
  sql: `-- Write your SQL queries here
SELECT * FROM users;

-- Example query
SELECT 
    name,
    email,
    created_at
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;`,
  json: `{
  "name": "Example",
  "type": "JSON",
  "data": {
    "value": 123,
    "items": ["item1", "item2", "item3"]
  }
}`,
};

export default function CodeSandbox({
  title = 'Code Sandbox',
  language = 'javascript',
  initialCode,
  template,
  instructions,
  readOnly = false,
}: CodeSandboxProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [code, setCode] = useState(initialCode || template || CODE_TEMPLATES[language] || CODE_TEMPLATES.javascript);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Update code when language changes
  useEffect(() => {
    if (!initialCode && !template) {
      setCode(CODE_TEMPLATES[selectedLanguage] || '');
    }
  }, [selectedLanguage, initialCode, template]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const executeCode = async () => {
    setIsRunning(true);
    setError('');
    setOutput('');

    try {
      if (selectedLanguage === 'javascript') {
        // Execute JavaScript in browser
        const logs: string[] = [];
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = (...args: any[]) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
          originalLog(...args);
        };
        
        console.error = (...args: any[]) => {
          logs.push('ERROR: ' + args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
          originalError(...args);
        };

        try {
          // Create a safe execution context
          const func = new Function(code);
          func();
          setOutput(logs.join('\n') || 'Code executed successfully (no output)');
        } catch (e: any) {
          setError(e.message || 'Execution error');
          setOutput(logs.join('\n'));
        } finally {
          console.log = originalLog;
          console.error = originalError;
        }
      } else if (selectedLanguage === 'html') {
        // Execute HTML/CSS/JS in iframe
        setShowPreview(true);
        if (iframeRef.current) {
          const iframe = iframeRef.current;
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            doc.open();
            doc.write(code);
            doc.close();
          }
        }
        setOutput('HTML rendered in preview panel');
      } else if (selectedLanguage === 'python') {
        // For Python, show note about execution
        setOutput('Python execution requires a server-side environment.\n\n' +
          'To execute Python code:\n' +
          '1. Copy your code\n' +
          '2. Use an online Python interpreter (repl.it, Python.org shell)\n' +
          '3. Or install Python locally and run: python your_file.py\n\n' +
          'Your code:\n' + code);
      } else {
        // For other languages, show the code
        setOutput(`Code ready for execution:\n\n${code}\n\n` +
          `Note: This language requires a compiler/interpreter to run.\n` +
          `Copy your code and use an appropriate development environment.`);
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setOutput('');
    setError('');
    setShowPreview(false);
  };

  const resetCode = () => {
    if (confirm('Are you sure you want to reset the code to the template?')) {
      setCode(CODE_TEMPLATES[selectedLanguage] || '');
      clearOutput();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {!readOnly && (
            <div className="flex items-center gap-2">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.icon} {lang.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {instructions && (
          <p className="mt-2 text-sm text-gray-600">{instructions}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Code Editor */}
        <div className="border-r border-gray-200">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600">
                {LANGUAGES.find(l => l.value === selectedLanguage)?.icon} {LANGUAGES.find(l => l.value === selectedLanguage)?.label}
              </span>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={resetCode}
                  className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Reset to template"
                >
                  ↻ Reset
                </button>
              </div>
            )}
          </div>
          <div className="relative">
            <textarea
              value={code}
              onChange={(e) => !readOnly && setCode(e.target.value)}
              readOnly={readOnly}
              className={`w-full h-96 p-4 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                readOnly ? 'cursor-not-allowed opacity-75' : ''
              }`}
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
                tabSize: 2,
              }}
              spellCheck={false}
              placeholder="Write your code here..."
            />
            {readOnly && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                <span className="text-white text-sm font-medium">Read-only mode</span>
              </div>
            )}
          </div>
          {!readOnly && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {code.split('\n').length} lines • {code.length} characters
              </div>
              <button
                onClick={executeCode}
                disabled={isRunning}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20a7.962 7.962 0 01-8-8h4z"></path>
                    </svg>
                    Running...
                  </>
                ) : (
                  <>
                    ▶ Run Code
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Output/Preview Panel */}
        <div className="flex flex-col">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">
              {selectedLanguage === 'html' ? 'Preview' : 'Output'}
            </span>
            {output && (
              <button
                onClick={clearOutput}
                className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto bg-gray-900">
            {selectedLanguage === 'html' && showPreview ? (
              <iframe
                ref={iframeRef}
                className="w-full h-full border-0"
                title="Code Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div
                ref={outputRef}
                className="p-4 font-mono text-sm text-green-400 h-full overflow-auto"
                style={{
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {error && (
                  <div className="text-red-400 mb-2">
                    <span className="font-bold">Error:</span> {error}
                  </div>
                )}
                {output || (
                  <div className="text-gray-500 italic">
                    Click "Run Code" to execute your code and see the output here.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

