"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { Icon } from "@iconify/react";
import { Extension } from "@tiptap/core";

// Custom extension to preserve HTML attributes and styles
const PreserveHTMLAttributes = Extension.create({
  name: 'preserveHTMLAttributes',
  
  addGlobalAttributes() {
    return [
      {
        // Preserve styles and classes on block-level elements
        types: ['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'codeBlock', 'table', 'tableRow', 'tableCell', 'tableHeader'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => element.getAttribute('style'),
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }
              return {
                style: attributes.style,
              };
            },
          },
          class: {
            default: null,
            parseHTML: (element) => element.getAttribute('class'),
            renderHTML: (attributes) => {
              if (!attributes.class) {
                return {};
              }
              return {
                class: attributes.class,
              };
            },
          },
        },
      },
      {
        // Preserve styles on text marks and inline elements
        types: ['textStyle'],
        attributes: {
          style: {
            default: null,
            parseHTML: (element) => {
              // Get all style attributes including font-family, font-size, font-weight, etc.
              const style = element.getAttribute('style');
              return style;
            },
            renderHTML: (attributes) => {
              if (!attributes.style) {
                return {};
              }
              return {
                style: attributes.style,
              };
            },
          },
        },
      },
    ];
  },
  
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { style: `font-family: ${fontFamily}` })
          .run();
      },
      setFontSize: (fontSize: string) => ({ chain }: any) => {
        return chain()
          .setMark('textStyle', { style: `font-size: ${fontSize}` })
          .run();
      },
    } as any;
  },
});

interface LearnboardEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}

export default function LearnboardEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  height = 400,
  showFullscreenButton = true,
}: LearnboardEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [textColorOpen, setTextColorOpen] = useState(false);
  const [backgroundColorOpen, setBackgroundColorOpen] = useState(false);
  const [showHtmlView, setShowHtmlView] = useState(false);
  const [htmlContent, setHtmlContent] = useState(value || "");
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageUploadDialog, setShowImageUploadDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previousValueRef = useRef<string>(value);
  const editorRef = useRef<any>(null);

  // Handle image upload with file size validation
  const handleImageUpload = useCallback(async (file: File) => {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds 10MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      // API returns fileUrl directly in response
      const fileUrl = data.fileUrl || data.file?.url || data.url;
      
      if (!fileUrl) {
        throw new Error("Upload succeeded but no file URL was returned");
      }
      
      return fileUrl;
    } catch (error) {
      console.error("Image upload error:", error);
      // Fallback to base64 if upload fails
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }
  }, []);

  const editor = useEditor({
    extensions: [
      PreserveHTMLAttributes,
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Configure list item to not wrap content in paragraphs
        listItem: {
          HTMLAttributes: {
            class: 'learnboard-list-item',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-yellow-600 underline hover:text-yellow-700',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-md',
        },
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'learnboard-table',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'learnboard-table-row',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'learnboard-table-header',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'learnboard-table-cell',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'blockquote'],
        defaultAlignment: 'left',
      }),
      Color,
      TextStyle.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            style: {
              default: null,
              parseHTML: (element) => {
                const htmlElement = element as HTMLElement;
                return htmlElement.getAttribute('style');
              },
              renderHTML: (attributes) => {
                if (!attributes.style) {
                  return {};
                }
                return {
                  style: attributes.style,
                };
              },
            },
          };
        },
        parseHTML() {
          return [
            {
              tag: 'span[style]',
              getAttrs: (element) => {
                const htmlElement = element as HTMLElement;
                const style = htmlElement.getAttribute('style') || '';
                // Preserve all style attributes including font-family, font-size, font-weight, etc.
                if (style) {
                  return { style };
                }
                return {};
              },
            },
            {
              tag: 'span',
            },
          ];
        },
        renderHTML({ HTMLAttributes }) {
          // Preserve all style attributes when rendering, including font-family, font-size, etc.
          const style = HTMLAttributes.style || '';
          if (style) {
            return ['span', { style }, 0];
          }
          return ['span', 0];
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      Typography,
      HorizontalRule,
    ],
    content: value || "",
    editable: !readOnly,
    autofocus: !readOnly,
    parseOptions: {
      preserveWhitespace: 'full',
    },
    editorProps: {
      attributes: {
        class: readOnly
          ? "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none focus:outline-none learnboard-editor-content"
          : "prose prose-sm sm:prose lg:prose-lg xl:prose-2xl max-w-none focus:outline-none min-h-[200px] learnboard-editor-content",
        style: "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6;",
      },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData.items);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file && editorRef.current) {
            handleImageUpload(file).then(url => {
              if (editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: url }).run();
              }
            }).catch(err => {
              console.error("Paste image upload failed:", err);
              // Fallback to base64
              const reader = new FileReader();
              reader.onload = () => {
                if (editorRef.current) {
                  editorRef.current.chain().focus().setImage({ src: reader.result as string }).run();
                }
              };
              reader.onerror = () => {
                console.error("FileReader error during paste");
              };
              reader.readAsDataURL(file);
            });
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/') && editorRef.current) {
            event.preventDefault();
            handleImageUpload(file).then(url => {
              if (editorRef.current) {
                editorRef.current.chain().focus().setImage({ src: url }).run();
              }
            }).catch(err => {
              console.error("Drop image upload failed:", err);
              // Fallback to base64
              const reader = new FileReader();
              reader.onload = () => {
                if (editorRef.current) {
                  editorRef.current.chain().focus().setImage({ src: reader.result as string }).run();
                }
              };
              reader.onerror = () => {
                console.error("FileReader error during drop");
              };
              reader.readAsDataURL(file);
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (!readOnly) {
        const html = editor.getHTML();
        previousValueRef.current = html;
        onChange(html);
      }
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
  });

  // Update editor ref when editor changes (defensive)
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor]);

  // Update placeholder when prop changes - recreate extension
  useEffect(() => {
    if (editor && placeholder) {
      // Note: Placeholder extension options are set during initialization
      // To update dynamically, we'd need to recreate the editor, which is expensive
      // For now, placeholder updates only work on initial mount
      // This is a known limitation of TipTap extensions
    }
  }, [editor, placeholder]);

  // Update content when value prop changes (external updates) - with loop prevention
  useEffect(() => {
    if (editor && value !== previousValueRef.current) {
      const newValue = value || "";
      previousValueRef.current = newValue;
      
      // Try to set content with proper HTML parsing
      try {
        // TipTap should parse HTML correctly, but ensure we handle edge cases
        if (newValue.trim()) {
          editor.commands.setContent(newValue, false);
        } else {
          editor.commands.clearContent(false);
        }
      } catch (error) {
        console.error('Error setting editor content:', error);
        // If parsing fails, try to sanitize and set
        try {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = newValue;
          // TipTap will parse this correctly
          editor.commands.setContent(tempDiv.innerHTML, false);
        } catch (fallbackError) {
          console.error('Fallback content setting also failed:', fallbackError);
        }
      }
      
      // Sync htmlContent when not in HTML view mode or when value changes externally
      if (!showHtmlView || newValue !== htmlContent) {
        setHtmlContent(newValue);
      }
    }
  }, [value, editor, showHtmlView, htmlContent]);

  // Toggle HTML view
  const toggleHtmlView = () => {
    if (editor) {
      if (showHtmlView) {
        // Switch from HTML to visual: update editor with HTML content
        try {
          editor.commands.setContent(htmlContent, false);
          previousValueRef.current = editor.getHTML();
          onChange(editor.getHTML());
        } catch (error) {
          console.error("Error setting HTML content:", error);
          setErrorMessage("Invalid HTML. Please check your code.");
          setTimeout(() => setErrorMessage(null), 5000);
          return;
        }
      } else {
        // Switch from visual to HTML: save current HTML
        setHtmlContent(editor.getHTML());
      }
      setShowHtmlView(!showHtmlView);
    }
  };

  // Helper to safely execute editor commands with better error handling
  const executeCommand = (commandFn: () => void, errorMsg?: string) => {
    if (!editor) {
      console.warn("Editor not initialized");
      return;
    }
    try {
      // Execute the command (which already includes focus chain)
      commandFn();
    } catch (error) {
      console.error(errorMsg || "Command execution error:", error);
      // Try again without focus chain
      try {
        // Remove focus from command if it exists
        const commandStr = commandFn.toString();
        if (commandStr.includes('chain()')) {
          // Extract just the command without chain().focus()
          const simpleCommand = commandFn.toString().replace(/editor\.chain\(\)\.focus\(\)\./g, 'editor.');
          // This is a fallback - most commands should work anyway
        }
        commandFn();
      } catch (retryError) {
        console.error("Retry failed:", retryError);
      }
    }
  };

  // Handle fullscreen with proper browser API
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(console.error);
        } else {
          setIsFullscreen(false);
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      if (isFullscreen) {
        document.removeEventListener("keydown", handleEscape);
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
      }
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.color-picker-container')) {
        setTextColorOpen(false);
        setBackgroundColorOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setTextColorOpen, setBackgroundColorOpen]);

  const toggleFullscreen = async () => {
    if (!editorContainerRef.current) return;

    try {
      if (!document.fullscreenElement && !isFullscreen) {
        // Enter fullscreen
        await editorContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      // Fallback to CSS-based fullscreen if browser API fails
      setIsFullscreen(!isFullscreen);
    }
  };

  // Handle link dialog with edit/remove
  const handleLinkDialog = () => {
    if (!editor) return;
    
    if (editor.isActive("link")) {
      // Edit or remove existing link
      const attrs = editor.getAttributes("link");
      setLinkUrl(attrs.href || "");
      setShowLinkDialog(true);
    } else {
      // Create new link
      setLinkUrl("");
      setShowLinkDialog(true);
    }
  };

  const handleLinkSubmit = () => {
    if (!editor) return;
    
    if (linkUrl.trim() === "") {
      // Remove link if empty
        editor.chain().focus().unsetLink().run();
      } else {
      // Validate URL format
      let url = linkUrl.trim();
      if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/") && !url.startsWith("mailto:") && !url.startsWith("#")) {
        url = `https://${url}`;
      }
        editor.chain().focus().setLink({ href: url }).run();
      }
    setShowLinkDialog(false);
    setLinkUrl("");
  };

  // Handle image insertion with URL or file options
  const handleImageClick = () => {
    if (!editor) return;
    setShowImageUploadDialog(true);
  };

  const handleImageUrlSubmit = () => {
    if (!editor) return;
    
    if (imageUrl.trim()) {
      let url = imageUrl.trim();
        // Basic URL validation
      if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("/") && !url.startsWith("data:")) {
        url = `https://${url}`;
      }
      editor.chain().focus().setImage({ src: url }).run();
    }
    setShowImageUploadDialog(false);
    setImageUrl("");
  };

  const handleImageUploadClick = () => {
    setShowImageUploadDialog(false);
    imageInputRef.current?.click();
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor && !editorRef.current) return;
    
    const file = e.target.files?.[0];
    if (!file) {
      // Reset input if no file selected
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      return;
    }

    if (file.type.startsWith('image/')) {
      try {
        const url = await handleImageUpload(file);
        const activeEditor = editor || editorRef.current;
        if (activeEditor) {
          activeEditor.chain().focus().setImage({ src: url }).run();
          setErrorMessage(null);
        } else {
          throw new Error("Editor not available");
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to upload image. Please try again.";
        setErrorMessage(errorMsg);
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } else {
      setErrorMessage("Please select an image file.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
    // Always reset input after handling
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  if (!editor) {
    return null;
  }

  const MenuBar = () => {
    if (readOnly) return null;

    return (
      <div className="border-b border-gray-200 bg-gray-50">
        {/* Row 1: Text Formatting, Headings, Lists */}
        <div className="flex flex-wrap gap-1 items-center p-2 border-b border-gray-200">
        {/* Text Formatting */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleBold().run(), "Bold toggle failed")}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("bold") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          } ${!editor.can().chain().focus().toggleBold().run() ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Bold (Ctrl+B)"
        >
          <Icon icon="material-symbols:format-bold" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Bold</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleItalic().run(), "Italic toggle failed")}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("italic") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          } ${!editor.can().chain().focus().toggleItalic().run() ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Italic (Ctrl+I)"
        >
          <Icon icon="material-symbols:format-italic" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Italic</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleUnderline().run(), "Underline toggle failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("underline") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Underline"
        >
          <Icon icon="material-symbols:format-underlined" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Underline</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleStrike().run(), "Strikethrough toggle failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("strike") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Strikethrough"
        >
          <Icon icon="material-symbols:strikethrough-s" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Strike</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleSubscript().run(), "Subscript toggle failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("subscript") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Subscript"
        >
          <Icon icon="material-symbols:subscript" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Sub</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleSuperscript().run(), "Superscript toggle failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("superscript") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Superscript"
        >
          <Icon icon="material-symbols:superscript" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Super</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Headings */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Heading 1 failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("heading", { level: 1 }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Heading 1"
        >
          <Icon icon="material-symbols:format-h1" className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">H1</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Heading 2 failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("heading", { level: 2 }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Heading 2"
        >
          <Icon icon="material-symbols:format-h2" className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">H2</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Heading 3 failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("heading", { level: 3 }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Heading 3"
        >
          <Icon icon="material-symbols:format-h3" className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">H3</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleBulletList().run(), "Bullet list failed")}
          disabled={!editor.can().toggleBulletList()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("bulletList") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          } ${!editor.can().toggleBulletList() ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Bullet List"
        >
          <Icon icon="material-symbols:format-list-bulleted" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Bullets</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleOrderedList().run(), "Numbered list failed")}
          disabled={!editor.can().toggleOrderedList()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("orderedList") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          } ${!editor.can().toggleOrderedList() ? "opacity-50 cursor-not-allowed" : ""}`}
          title="Numbered List"
        >
          <Icon icon="material-symbols:format-list-numbered" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Numbers</span>
        </button>
        </div>

        {/* Row 2: Alignment, Colors, Media */}
        <div className="flex flex-wrap gap-1 items-center p-2 border-b border-gray-200">
        {/* Alignment */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign("left").run(), "Align left failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive({ textAlign: "left" }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Align Left"
        >
          <Icon icon="material-symbols:format-align-left" className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign("center").run(), "Align center failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive({ textAlign: "center" }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Align Center"
        >
          <Icon icon="material-symbols:format-align-center" className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign("right").run(), "Align right failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive({ textAlign: "right" }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Align Right"
        >
          <Icon icon="material-symbols:format-align-right" className="w-4 h-4" />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign("justify").run(), "Justify failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive({ textAlign: "justify" }) ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Justify"
        >
          <Icon icon="material-symbols:format-align-justify" className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Text Color */}
        <div 
          className="relative"
          onMouseEnter={() => setTextColorOpen(true)}
          onMouseLeave={() => setTextColorOpen(false)}
        >
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
              editor.isActive("textStyle") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
            }`}
            title="Text Color"
          >
            <Icon icon="material-symbols:format-color-text" className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Color</span>
          </button>
          {textColorOpen && (
            <div 
              className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-6 gap-1">
                {[
                  "#000000", "#76C74C", "#FBC02D", "#1A237E",
                  "#e74c3c", "#3498db", "#9b59b6", "#2ecc71",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.chain().focus().setColor(color).run();
                      setTextColorOpen(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background Color / Highlight */}
        <div className="relative color-picker-container">
          <button
            onClick={() => setBackgroundColorOpen(!backgroundColorOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
              editor.isActive("highlight") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
            }`}
            title="Background Color"
          >
            <Icon icon="material-symbols:format-color-fill" className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">BG Color</span>
          </button>
          {backgroundColorOpen && (
            <div 
              className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-50 color-picker-container"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-6 gap-1">
                {[
                  "#fef08a", "#fecaca", "#fed7aa", "#fde68a",
                  "#d1fae5", "#bfdbfe", "#ddd6fe", "#fce7f3",
                  "#ffffff", "#f3f4f6", "#e5e7eb", "#d1d5db",
                ].map((color) => (
                  <button
                    key={color}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editor.isActive("highlight", { color })) {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().toggleHighlight({ color }).run();
                      }
                      setBackgroundColorOpen(false);
                    }}
                    className={`w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform ${
                      editor.isActive("highlight", { color }) ? "ring-2 ring-blue-500 ring-offset-1" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.chain().focus().unsetHighlight().run();
                    setBackgroundColorOpen(false);
                  }}
                  className="w-full text-xs text-gray-600 hover:text-gray-900 px-2 py-1 text-center"
                >
                  Remove Background
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remove Format */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().unsetAllMarks().run(), "Remove format failed")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all text-gray-700"
          title="Remove Formatting"
        >
          <Icon icon="material-symbols:format-clear" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Clear</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Link */}
        <button
          onClick={handleLinkDialog}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("link") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title={editor.isActive("link") ? "Edit/Remove Link" : "Insert Link"}
        >
          <Icon icon="material-symbols:link" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Link</span>
        </button>

        {/* Image */}
        <button
          onClick={handleImageClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all text-gray-700"
          title="Insert Image (or drag & drop)"
        >
          <Icon icon="material-symbols:image" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Image</span>
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
        </div>

        {/* Row 3: Advanced Elements & Actions */}
        <div className="flex flex-wrap gap-1 items-center p-2">
        {/* Table */}
        <div className="relative group">
          <button
            onClick={() => executeCommand(() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run(), "Insert table failed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
              editor.isActive("table") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
            }`}
            title="Insert Table"
          >
            <Icon icon="material-symbols:table-chart" className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Table</span>
          </button>
          {editor.isActive("table") && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-50 flex flex-col gap-1">
              <button
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="px-3 py-1 text-sm text-left hover:bg-gray-100 rounded"
                title="Add Row Before"
              >
                Add Row Before
              </button>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="px-3 py-1 text-sm text-left hover:bg-gray-100 rounded"
                title="Add Row After"
              >
                Add Row After
              </button>
              <button
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="px-3 py-1 text-sm text-left hover:bg-gray-100 rounded"
                title="Delete Row"
              >
                Delete Row
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="px-3 py-1 text-sm text-left hover:bg-gray-100 rounded"
                title="Add Column Before"
              >
                Add Column Before
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="px-3 py-1 text-sm text-left hover:bg-gray-100 rounded"
                title="Add Column After"
              >
                Add Column After
              </button>
              <button
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="px-3 py-1 text-sm text-left hover:bg-gray-100 rounded"
                title="Delete Column"
              >
                Delete Column
              </button>
              <div className="border-t border-gray-200 my-1" />
              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="px-3 py-1 text-sm text-left hover:bg-red-100 text-red-600 rounded"
                title="Delete Table"
              >
                Delete Table
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Code */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleCodeBlock().run(), "Code block failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("codeBlock") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Code Block"
        >
          <Icon icon="material-symbols:code" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Code</span>
        </button>

        {/* Blockquote */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleBlockquote().run(), "Blockquote failed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            editor.isActive("blockquote") ? "bg-blue-100 text-blue-700 border-blue-300" : "text-gray-700"
          }`}
          title="Blockquote"
        >
          <Icon icon="material-symbols:format-quote" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Quote</span>
        </button>

        {/* Horizontal Rule */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setHorizontalRule().run(), "Horizontal rule failed")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all text-gray-700"
          title="Horizontal Rule"
        >
          <Icon icon="material-symbols:horizontal-rule" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">HR</span>
        </button>

        <div className="flex-1" />

        {/* HTML View Toggle */}
        <button
          onClick={toggleHtmlView}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all ${
            showHtmlView ? "bg-green-100 text-green-700 border-green-300" : "text-gray-700"
          }`}
          title={showHtmlView ? "Switch to Visual Editor" : "Switch to HTML Source"}
        >
          <Icon icon={showHtmlView ? "material-symbols:code-off" : "material-symbols:code"} className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">{showHtmlView ? "Visual" : "HTML"}</span>
        </button>

          <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => executeCommand(() => editor.chain().focus().undo().run(), "Undo failed")}
          disabled={!editor.can().chain().focus().undo().run()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all text-gray-700 ${
            !editor.can().chain().focus().undo().run() ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Icon icon="material-symbols:undo" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Undo</span>
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().redo().run(), "Redo failed")}
          disabled={!editor.can().chain().focus().redo().run()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all text-gray-700 ${
            !editor.can().chain().focus().redo().run() ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Icon icon="material-symbols:redo" className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Redo</span>
        </button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={editorContainerRef}
      className={`relative rounded-xl border border-gray-200 bg-white shadow-sm ${
        isFullscreen ? "fixed inset-0 z-[9999] bg-white" : ""
      }`}
      style={
        isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
            }
          : readOnly
          ? {}
          : { minHeight: `${height}px` }
      }
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
              icon={
                isFullscreen
                  ? "material-symbols:fullscreen-exit"
                  : "material-symbols:fullscreen"
              }
              className="w-4 h-4"
            />
            <span className="hidden sm:inline">
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </span>
          </button>
        </div>
      )}

      {/* Menu Bar */}
      <div className={isFullscreen ? "sticky top-0 z-10 bg-gray-50" : ""}>
        <MenuBar />
      </div>

      {/* Editor Content */}
      <div
        className={`${isFullscreen ? "h-screen overflow-auto bg-white" : ""}`}
        style={
          isFullscreen
            ? {
                height: "100vh",
                display: "flex",
                flexDirection: "column",
              }
            : !readOnly && !isFullscreen
            ? { minHeight: `${height}px` }
            : {}
        }
      >
        <div className={isFullscreen ? "flex-1 overflow-auto p-4" : "p-4"}>
          {showHtmlView && !readOnly ? (
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="w-full font-mono text-sm border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              style={{
                minHeight: isFullscreen
                  ? "calc(100vh - 200px)"
                  : readOnly
                  ? "auto"
                  : `${height - 100}px`,
              }}
              placeholder="Enter HTML code here..."
            />
          ) : (
            <EditorContent
              editor={editor}
              className="focus-within:outline-none"
              style={{
                minHeight: isFullscreen
                  ? "calc(100vh - 200px)"
                  : readOnly
                  ? "auto"
                  : `${height - 100}px`,
              }}
            />
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-100 border-2 border-red-400 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-md">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:alert-circle" className="w-5 h-5" />
              <span className="text-sm font-medium">{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editor?.isActive("link") ? "Edit Link" : "Insert Link"}
            </h3>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLinkSubmit();
                if (e.key === "Escape") {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }
              }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              {editor?.isActive("link") && (
                <button
                  onClick={() => {
                    if (editor) {
                      editor.chain().focus().unsetLink().run();
                    }
                    setShowLinkDialog(false);
                    setLinkUrl("");
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  Remove
                </button>
              )}
              <button
                onClick={handleLinkSubmit}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                {editor?.isActive("link") ? "Update" : "Insert"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageUploadDialog && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Insert Image</h3>
            <div className="space-y-3 mb-4">
              <button
                onClick={handleImageUploadClick}
                className="w-full px-4 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
              >
                Upload Image File
              </button>
              <div className="text-center text-gray-500">or</div>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Enter Image URL..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleImageUrlSubmit();
                  if (e.key === "Escape") {
                    setShowImageUploadDialog(false);
                    setImageUrl("");
                  }
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowImageUploadDialog(false);
                  setImageUrl("");
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              {imageUrl.trim() && (
                <button
                  onClick={handleImageUrlSubmit}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                >
                  Insert
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Overlay Instructions */}
      {isFullscreen && (
        <div className="absolute top-16 right-4 z-20">
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
            Press <kbd className="bg-white/20 px-1 rounded">ESC</kbd> to exit fullscreen
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style jsx global>{`
        /* Override prose styles that interfere with lists */
        .learnboard-editor-content.prose ul,
        .learnboard-editor-content.prose ol {
          list-style-position: outside !important;
          padding-left: 2em !important;
          list-style-type: disc !important;
        }
        
        .learnboard-editor-content.prose ol {
          list-style-type: decimal !important;
        }
        
        .learnboard-editor-content.prose li {
          display: list-item !important;
          list-style-position: outside !important;
          margin-left: 0 !important;
          padding-left: 0.5em !important;
        }
        
        /* Prevent list item paragraphs from wrapping bullets/numbers */
        .learnboard-editor-content.prose li p,
        .ProseMirror li p {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Ensure list content stays on same line */
        .learnboard-editor-content.prose li > p:first-child,
        .ProseMirror li > p:first-child {
          display: inline !important;
        }
        
        .ProseMirror {
          outline: none;
          padding: 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
          font-size: 16px;
          line-height: 1.6;
          color: #1a1a1a;
        }
        
        /* Inline styles in style attributes automatically have highest CSS specificity
           No need to override - browser will apply them correctly */
        
        /* Preserve font styles from style attributes - inline styles have highest priority */
        .ProseMirror p[style],
        .ProseMirror h1[style],
        .ProseMirror h2[style],
        .ProseMirror h3[style],
        .ProseMirror h4[style],
        .ProseMirror h5[style],
        .ProseMirror h6[style],
        .ProseMirror span[style],
        .ProseMirror div[style],
        .ProseMirror li[style],
        .ProseMirror td[style],
        .ProseMirror th[style],
        .ProseMirror strong[style],
        .ProseMirror em[style],
        .ProseMirror u[style],
        .ProseMirror code[style] {
          /* Inline styles in style attribute take precedence - browser will apply them */
        }
        
        /* Ensure highlight/background colors render properly */
        .ProseMirror mark {
          padding: 0.125em 0.25em;
          border-radius: 0.25em;
        }
        
        .ProseMirror mark[data-color] {
          background-color: var(--highlight-color);
        }
        
        /* Preserve background colors from style attributes */
        .ProseMirror [style*="background-color"],
        .ProseMirror [style*="background"] {
          /* Inline styles will be applied by browser */
        }
        
        /* Handle font tags (legacy HTML) */
        .ProseMirror font {
          display: inline;
        }
        
        .ProseMirror font[face] {
          font-family: attr(face);
        }
        
        .ProseMirror font[size] {
          font-size: attr(size);
        }
        
        .ProseMirror font[color] {
          color: attr(color);
        }
        
        .ProseMirror h1,
        .ProseMirror h2,
        .ProseMirror h3,
        .ProseMirror h4,
        .ProseMirror h5,
        .ProseMirror h6 {
          display: block !important;
          font-weight: bold !important;
          margin-top: 1em !important;
          margin-bottom: 0.5em !important;
          color: #76c74c !important;
          line-height: 1.2 !important;
        }
        
        .ProseMirror h1 {
          font-size: 2em !important;
          font-weight: 700 !important;
        }
        
        .ProseMirror h2 {
          font-size: 1.5em !important;
          font-weight: 700 !important;
        }
        
        .ProseMirror h3 {
          font-size: 1.25em !important;
          font-weight: 600 !important;
        }
        
        .ProseMirror h4 {
          font-size: 1.125em !important;
          font-weight: 600 !important;
        }
        
        .ProseMirror h5 {
          font-size: 1em !important;
          font-weight: 600 !important;
        }
        
        .ProseMirror h6 {
          font-size: 0.875em !important;
          font-weight: 600 !important;
        }
        
        .ProseMirror p {
          margin-bottom: 1em;
          font-size: inherit;
          font-family: inherit;
          line-height: 1.6;
        }
        
        /* Ensure text nodes inherit font styles */
        .ProseMirror p,
        .ProseMirror li,
        .ProseMirror td,
        .ProseMirror th,
        .ProseMirror div {
          font-family: inherit;
          font-size: inherit;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          margin: 1em 0;
          padding-left: 2em;
          list-style-position: outside;
        }
        
        .ProseMirror ul {
          list-style-type: disc;
        }
        
        .ProseMirror ol {
          list-style-type: decimal;
        }
        
        .ProseMirror li {
          margin: 0.25em 0;
          padding-left: 0.5em;
          display: list-item;
          list-style-position: outside;
        }
        
        /* Ensure list items don't wrap bullets/numbers to next line */
        .ProseMirror li p {
          display: inline !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        .ProseMirror li > *:first-child {
          display: inline !important;
        }
        
        /* Fix list item content to stay on same line as bullet/number */
        .ProseMirror li {
          line-height: 1.6;
        }
        
        .ProseMirror li::marker {
          display: inline-block;
        }
        
        .ProseMirror ul ul,
        .ProseMirror ol ol,
        .ProseMirror ul ol,
        .ProseMirror ol ul {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #76c74c;
          margin: 1em 0;
          padding-left: 1em;
          color: #4a4a4a;
          background: #f1f8e9;
          padding: 1em;
          border-radius: 0.5rem;
        }
        
        .ProseMirror code {
          background-color: #f1f8e9;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: "Courier New", monospace;
          color: #1a237e;
        }
        
        .ProseMirror pre {
          background-color: #f1f8e9;
          padding: 1em;
          border-radius: 5px;
          overflow-x: auto;
          border: 1px solid #e8f5e8;
        }
        
        .ProseMirror pre code {
          background: none;
          padding: 0;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(118, 199, 76, 0.15);
          cursor: pointer;
        }
        
        .ProseMirror img:hover {
          opacity: 0.9;
        }
        
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
          border: 1px solid #e8f5e8;
        }
        
        .ProseMirror th,
        .ProseMirror td {
          border: 1px solid #e8f5e8;
          padding: 8px 12px;
          text-align: left;
        }
        
        .ProseMirror th {
          background-color: #f1f8e9;
          font-weight: bold;
          color: #76c74c;
        }
        
        /* Add alternating row shading for tables */
        /* Target both with and without tbody for compatibility */
        .ProseMirror table tbody tr:nth-child(even),
        .ProseMirror table > tr:nth-child(even) {
          background-color: #f9fafb !important;
        }
        
        .ProseMirror table tbody tr:nth-child(odd),
        .ProseMirror table > tr:nth-child(odd) {
          background-color: #ffffff !important;
        }
        
        .ProseMirror table tbody tr:hover,
        .ProseMirror table > tr:hover {
          background-color: #f1f8e9 !important;
        }
        
        /* Ensure header row doesn't get shaded */
        .ProseMirror table thead tr,
        .ProseMirror table > tr:first-child {
          background-color: #f1f8e9 !important;
        }
        
        .ProseMirror a {
          color: #fbc02d;
          text-decoration: underline;
        }
        
        .ProseMirror a:hover {
          color: #f9a825;
        }
        
        .ProseMirror hr {
          margin: 1em 0;
          border: none;
          border-top: 2px solid #e8f5e8;
        }
      `}</style>
    </div>
  );
}
