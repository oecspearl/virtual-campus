"use client";

import React, { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { Icon } from "@iconify/react";

interface TinyMCEEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}

export default function TinyMCEEditor({ 
  value, 
  onChange, 
  readOnly = false, 
  placeholder = "Start typing...",
  height = 400,
  showFullscreenButton = true
}: TinyMCEEditorProps) {
  const editorRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleEditorChange = (content: string) => {
    onChange(content);
  };

  const toggleFullscreen = () => {
    if (editorRef.current) {
      if (isFullscreen) {
        editorRef.current.execCommand('mceFullScreen', false);
        setIsFullscreen(false);
      } else {
        editorRef.current.execCommand('mceFullScreen', true);
        setIsFullscreen(true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // ESC key to exit fullscreen
    if (e.key === 'Escape' && isFullscreen) {
      toggleFullscreen();
    }
  };

  const editorConfig = {
    height: readOnly ? 'auto' : height, // Auto height for read-only, fixed for editing
    min_height: readOnly ? 100 : 200, // Minimum height for editing
    max_height: readOnly ? 2000 : 800, // Maximum height for editing
    menubar: !readOnly,
    toolbar: readOnly ? false : [
      'undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | forecolor backcolor removeformat | pagebreak | charmap emoticons | fullscreen preview save print | insertfile image media link anchor codesample | ltr rtl',
      'fontsize fontfamily | subscript superscript | code | table | visualblocks visualchars | wordcount | help'
    ],
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
      'codesample', 'pagebreak', 'nonbreaking', 'autoresize'
    ],
    content_style: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; 
        font-size: 14px; 
        line-height: 1.6; 
        color: #1a1a1a; 
        margin: 16px; 
        background: #ffffff;
      }
      h1, h2, h3, h4, h5, h6 { 
        font-weight: bold; 
        margin-top: 1em; 
        margin-bottom: 0.5em; 
        color: #76C74C;
      }
      h1 { font-size: 2em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.25em; }
      p { margin-bottom: 1em; }
      ul, ol { margin-bottom: 1em; padding-left: 2em; }
      blockquote { 
        border-left: 4px solid #76C74C; 
        margin: 1em 0; 
        padding-left: 1em; 
        color: #4a4a4a; 
        background: #f1f8e9;
        padding: 1em;
        border-radius: 0.5rem;
      }
      code { 
        background-color: #f1f8e9; 
        padding: 2px 4px; 
        border-radius: 3px; 
        font-family: 'Courier New', monospace; 
        color: #1A237E;
      }
      pre { 
        background-color: #f1f8e9; 
        padding: 1em; 
        border-radius: 5px; 
        overflow-x: auto; 
        border: 1px solid #e8f5e8;
      }
      img { 
        max-width: 100%; 
        height: auto; 
        border-radius: 8px; 
        box-shadow: 0 2px 4px rgba(118, 199, 76, 0.15);
      }
      table { 
        border-collapse: collapse; 
        width: 100%; 
        margin-bottom: 1em; 
        border: 1px solid #e8f5e8;
      }
      th, td { 
        border: 1px solid #e8f5e8; 
        padding: 8px 12px; 
        text-align: left; 
      }
      th { 
        background-color: #f1f8e9; 
        font-weight: bold; 
        color: #76C74C;
      }
      a {
        color: #FBC02D;
        text-decoration: underline;
      }
      a:hover {
        color: #F9A825;
      }
    `,
    placeholder: placeholder,
    branding: false,
    promotion: false,
    resize: !readOnly ? 'both' : false, // Enable resize for both directions
    elementpath: !readOnly,
    statusbar: !readOnly,
    readonly: readOnly,
    // Fix resize handle visibility
    resize_handle: !readOnly,
    resize_handle_class: 'mce-resize-handle',
    setup: (editor: any) => {
      editor.on('init', () => {
        editorRef.current = editor;
        
        // Auto-resize for read-only mode
        if (readOnly) {
          editor.on('NodeChange', () => {
            // Trigger resize after content changes
            setTimeout(() => {
              editor.execCommand('mceAutoResize');
            }, 100);
          });
          
          // Initial resize
          setTimeout(() => {
            editor.execCommand('mceAutoResize');
          }, 200);
        }

        // Handle fullscreen events
        editor.on('FullscreenStateChanged', (e: any) => {
          setIsFullscreen(e.state);
        });

        // Improve resize handle visibility
        if (!readOnly) {
          editor.on('init', () => {
            // Add custom CSS for resize handle
            const style = document.createElement('style');
            style.textContent = `
              .mce-resize-handle {
                background: #007cba !important;
                border: 2px solid #fff !important;
                border-radius: 4px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                opacity: 0.8 !important;
                transition: opacity 0.2s ease !important;
              }
              .mce-resize-handle:hover {
                opacity: 1 !important;
                background: #005a87 !important;
              }
              .mce-resize-handle:active {
                background: #004085 !important;
              }
            `;
            document.head.appendChild(style);
          });
        }
      });
    },
    // Image upload configuration
    images_upload_handler: async (blobInfo: any) => {
      // For now, we'll convert to base64 for simplicity
      // In production, you'd want to upload to your server/storage
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blobInfo.blob());
      });
    },
    // File browser configuration
    file_picker_types: 'file image media',
    file_picker_callback: (callback: any, value: any, meta: any) => {
      // Simple file picker - in production, integrate with your file management system
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', meta.filetype === 'image' ? 'image/*' : '*/*');
      
      input.onchange = function() {
        const file = (this as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function() {
            callback(reader.result, {
              alt: file.name
            });
          };
          reader.readAsDataURL(file);
        }
      };
      
      input.click();
    },
    // Link configuration
    link_assume_external_targets: true,
    link_default_protocol: 'https://',
    // Table configuration
    table_default_attributes: {
      border: '1'
    },
    table_default_styles: {
      'border-collapse': 'collapse',
      'width': '100%'
    },
    // Code sample configuration
    codesample_languages: [
      { text: 'HTML/XML', value: 'markup' },
      { text: 'JavaScript', value: 'javascript' },
      { text: 'CSS', value: 'css' },
      { text: 'PHP', value: 'php' },
      { text: 'Ruby', value: 'ruby' },
      { text: 'Python', value: 'python' },
      { text: 'Java', value: 'java' },
      { text: 'C', value: 'c' },
      { text: 'C#', value: 'csharp' },
      { text: 'C++', value: 'cpp' },
      { text: 'SQL', value: 'sql' },
      { text: 'JSON', value: 'json' },
      { text: 'TypeScript', value: 'typescript' },
      { text: 'React JSX', value: 'jsx' },
      { text: 'Vue', value: 'vue' }
    ],
    // Accessibility
    a11y_advanced_options: true,
    // Auto-save (optional)
    autosave_ask_before_unload: true,
    // Custom formats
    style_formats: [
      { title: 'Headings', items: [
        { title: 'Heading 1', format: 'h1' },
        { title: 'Heading 2', format: 'h2' },
        { title: 'Heading 3', format: 'h3' },
        { title: 'Heading 4', format: 'h4' },
        { title: 'Heading 5', format: 'h5' },
        { title: 'Heading 6', format: 'h6' }
      ]},
      { title: 'Inline', items: [
        { title: 'Bold', format: 'bold' },
        { title: 'Italic', format: 'italic' },
        { title: 'Underline', format: 'underline' },
        { title: 'Strikethrough', format: 'strikethrough' },
        { title: 'Superscript', format: 'superscript' },
        { title: 'Subscript', format: 'subscript' },
        { title: 'Code', format: 'code' }
      ]},
      { title: 'Blocks', items: [
        { title: 'Paragraph', format: 'p' },
        { title: 'Blockquote', format: 'blockquote' },
        { title: 'Div', format: 'div' },
        { title: 'Pre', format: 'pre' }
      ]},
      { title: 'Alignment', items: [
        { title: 'Left', format: 'alignleft' },
        { title: 'Center', format: 'aligncenter' },
        { title: 'Right', format: 'alignright' },
        { title: 'Justify', format: 'alignjustify' }
      ]}
    ]
  };

  return (
    <div 
      className={`relative rounded-xl border border-gray-200 bg-white shadow-sm ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Fullscreen Button */}
      {showFullscreenButton && !readOnly && (
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm"
            title={isFullscreen ? "Exit Fullscreen (ESC)" : "Enter Fullscreen"}
          >
            <Icon 
              icon={isFullscreen ? "material-symbols:fullscreen-exit" : "material-symbols:fullscreen"} 
              className="w-4 h-4" 
            />
            <span className="hidden sm:inline">
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </span>
          </button>
        </div>
      )}
      
      {/* Editor Container */}
      <div className={`${isFullscreen ? 'h-screen' : ''}`}>
        <Editor
          apiKey="z39wv7ml8tzkph3j03ck5e2ewrgpmn9gl05dlhcxtdp9wqm2" // Use your TinyMCE API key here, or use 'no-api-key' for development
          onInit={(evt, editor) => {
            editorRef.current = editor;
          }}
          value={value || ""}
          onEditorChange={handleEditorChange}
          init={editorConfig as any}
        />
      </div>

      {/* Fullscreen Overlay Instructions */}
      {isFullscreen && (
        <div className="absolute top-16 right-4 z-20">
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
            Press <kbd className="bg-white/20 px-1 rounded">ESC</kbd> to exit fullscreen
          </div>
        </div>
      )}
    </div>
  );
}
