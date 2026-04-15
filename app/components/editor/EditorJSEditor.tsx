"use client";

import React, { useRef, useEffect, useState } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import Header from "@editorjs/header";
import List from "@editorjs/list";
import Paragraph from "@editorjs/paragraph";
import Quote from "@editorjs/quote";
import Code from "@editorjs/code";
import LinkTool from "@editorjs/link";
import Image from "@editorjs/image";
import Table from "@editorjs/table";
import Delimiter from "@editorjs/delimiter";
import Checklist from "@editorjs/checklist";
import Warning from "@editorjs/warning";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";

interface EditorJSEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}

export default function EditorJSEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  height = 400,
  showFullscreenButton = true,
}: EditorJSEditorProps) {
  const editorRef = useRef<EditorJS | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const previousValueRef = useRef<string>(value || "");

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (editorContainerRef.current?.requestFullscreen) {
        editorContainerRef.current.requestFullscreen();
      } else if ((editorContainerRef.current as any)?.webkitRequestFullscreen) {
        (editorContainerRef.current as any).webkitRequestFullscreen();
      } else if ((editorContainerRef.current as any)?.msRequestFullscreen) {
        (editorContainerRef.current as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(document.fullscreenElement || 
           (document as any).webkitFullscreenElement || 
           (document as any).msFullscreenElement)
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("msfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("msfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle image upload
  const handleImageUpload = async (file: File): Promise<{ success: number; file: { url: string } }> => {
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      return {
        success: 1,
        file: {
          url: data.url,
        },
      };
    } catch (error: any) {
      console.error("Image upload failed:", error);
      // Fallback to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            success: 1,
            file: {
              url: reader.result as string,
            },
          });
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    }
  };

  // Convert HTML to Editor.js format
  const convertHTMLToEditorJS = (html: string): OutputData => {
    if (typeof window === 'undefined') {
      return { blocks: [] };
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const blocks: any[] = [];

    // Process each element
    const processElement = (element: Element | Text) => {
      if (element.nodeType === Node.TEXT_NODE) {
        const text = element.textContent?.trim();
        if (text) {
          blocks.push({
            type: 'paragraph',
            data: { text },
          });
        }
        return;
      }

      const el = element as Element;
      const tagName = el.tagName.toLowerCase();

      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          blocks.push({
            type: 'header',
            data: {
              text: el.textContent || '',
              level: parseInt(tagName.charAt(1)),
            },
          });
          break;
        case 'p':
          const pText = el.textContent?.trim();
          if (pText) {
            blocks.push({
              type: 'paragraph',
              data: { text: pText },
            });
          }
          break;
        case 'blockquote':
          blocks.push({
            type: 'quote',
            data: {
              text: el.textContent || '',
            },
          });
          break;
        case 'ul':
        case 'ol':
          const items = Array.from(el.querySelectorAll('li')).map(li => li.textContent || '');
          blocks.push({
            type: 'list',
            data: {
              style: tagName === 'ol' ? 'ordered' : 'unordered',
              items,
            },
          });
          break;
        case 'pre':
        case 'code':
          blocks.push({
            type: 'code',
            data: {
              code: el.textContent || '',
            },
          });
          break;
        case 'img':
          blocks.push({
            type: 'image',
            data: {
              file: { url: (el as HTMLImageElement).src },
              caption: (el as HTMLImageElement).alt || '',
            },
          });
          break;
        case 'table':
          const rows = Array.from(el.querySelectorAll('tr')).map(tr =>
            Array.from(tr.querySelectorAll('td, th')).map(cell => cell.textContent || '')
          );
          blocks.push({
            type: 'table',
            data: {
              content: rows,
            },
          });
          break;
        default:
          // For other elements, extract text content
          const text = el.textContent?.trim();
          if (text && !el.querySelector('h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, pre, code, img, table')) {
            blocks.push({
              type: 'paragraph',
              data: { text },
            });
          }
      }

      // Process child elements that weren't already processed
      if (!['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'ul', 'ol', 'pre', 'code', 'img', 'table'].includes(tagName)) {
        Array.from(el.childNodes).forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            processElement(child as Element);
          }
        });
      }
    };

    Array.from(tempDiv.childNodes).forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        processElement(node as Element);
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
        blocks.push({
          type: 'paragraph',
          data: { text: node.textContent.trim() },
        });
      }
    });

    return {
      blocks: blocks.length > 0 ? blocks : [
        {
          type: 'paragraph',
          data: { text: html.replace(/<[^>]*>/g, '').trim() || placeholder },
        },
      ],
    };
  };

  // Initialize Editor.js
  useEffect(() => {
    if (typeof window === 'undefined' || editorRef.current) {
      return;
    }

    // Parse initial value (HTML to Editor.js format)
    let initialData: OutputData | undefined;
    if (value && value.trim()) {
      try {
        // Try to parse as JSON first (Editor.js format)
        const parsed = JSON.parse(value);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          initialData = parsed;
        } else {
          throw new Error('Not valid Editor.js format');
        }
      } catch {
        // If not JSON, convert HTML to Editor.js blocks
        initialData = convertHTMLToEditorJS(value);
      }
    }

    const editor = new EditorJS({
      holder: 'editorjs-container',
      placeholder,
      readOnly,
      data: initialData,
      tools: {
        header: {
          class: Header,
          config: {
            placeholder: 'Enter a header',
            levels: [1, 2, 3, 4, 5, 6],
            defaultLevel: 2,
          },
        },
        list: {
          class: List,
          inlineToolbar: true,
        },
        paragraph: {
          class: Paragraph,
          inlineToolbar: true,
        },
        quote: {
          class: Quote,
          inlineToolbar: true,
        },
        code: {
          class: Code,
        },
        linkTool: {
          class: LinkTool,
        },
        image: {
          class: Image,
          config: {
            uploader: {
              uploadByFile: handleImageUpload,
            },
          },
        },
        table: {
          // @ts-expect-error - Table plugin type mismatch with ToolConstructable
          class: Table,
          inlineToolbar: true,
        },
        delimiter: Delimiter,
        checklist: {
          class: Checklist,
          inlineToolbar: true,
        },
        warning: {
          class: Warning,
          inlineToolbar: true,
        },
        marker: {
          class: Marker,
        },
        inlineCode: {
          class: InlineCode,
        },
      },
      onChange: async () => {
        if (editor && isReady) {
          try {
            const outputData = await editor.save();
            const jsonString = JSON.stringify(outputData);
            previousValueRef.current = jsonString;
            // Convert Editor.js JSON to HTML for compatibility
            const html = convertEditorJSToHTML(outputData);
            onChange(html);
          } catch (error) {
            console.error('Error saving Editor.js content:', error);
          }
        }
      },
    });

    editor.isReady.then(() => {
      editorRef.current = editor;
      setIsReady(true);
    }).catch((error) => {
      console.error('Editor.js initialization error:', error);
    });

    return () => {
      if (editorRef.current && editorRef.current.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Update editor when value changes externally
  useEffect(() => {
    if (editorRef.current && value !== previousValueRef.current && isReady) {
      try {
        // Try to parse as JSON first (Editor.js format)
        const parsed = JSON.parse(value);
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          editorRef.current.render(parsed);
          previousValueRef.current = value;
        } else {
          throw new Error('Not valid Editor.js format');
        }
      } catch {
        // If not JSON, convert HTML to Editor.js format
        const converted = convertHTMLToEditorJS(value);
        editorRef.current.render(converted);
        previousValueRef.current = value;
      }
    }
  }, [value, isReady]);

  // Convert Editor.js JSON to HTML
  const convertEditorJSToHTML = (data: OutputData): string => {
    if (!data.blocks || data.blocks.length === 0) {
      return '';
    }

    return data.blocks.map((block) => {
      switch (block.type) {
        case 'header':
          const level = (block.data as any).level || 2;
          return `<h${level}>${(block.data as any).text || ''}</h${level}>`;
        case 'paragraph':
          return `<p>${(block.data as any).text || ''}</p>`;
        case 'quote':
          return `<blockquote>${(block.data as any).text || ''}</blockquote>`;
        case 'list':
          const items = (block.data as any).items || [];
          const tag = (block.data as any).style === 'ordered' ? 'ol' : 'ul';
          const listItems = items.map((item: string) => `<li>${item}</li>`).join('');
          return `<${tag}>${listItems}</${tag}>`;
        case 'code':
          return `<pre><code>${(block.data as any).code || ''}</code></pre>`;
        case 'image':
          return `<img src="${(block.data as any).file?.url || (block.data as any).url || ''}" alt="${(block.data as any).caption || ''}" />`;
        case 'table':
          const content = (block.data as any).content || [];
          const rows = content.map((row: string[]) => 
            `<tr>${row.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`
          ).join('');
          return `<table><tbody>${rows}</tbody></table>`;
        default:
          return '';
      }
    }).join('');
  };

  return (
    <div 
      ref={editorContainerRef}
      className={`relative rounded-lg border border-gray-200 bg-white shadow-sm ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}
      style={isFullscreen ? {} : { minHeight: `${height}px` }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 rounded-t-xl">
        <span className="text-sm font-medium text-gray-700">Editor.js</span>
        {showFullscreenButton && !readOnly && (
          <button
            onClick={toggleFullscreen}
            className="text-gray-600 hover:text-gray-900 p-1 rounded"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div 
        id="editorjs-container"
        className={isFullscreen ? 'h-full p-4' : 'p-4'}
        style={isFullscreen ? { height: 'calc(100vh - 60px)' } : { minHeight: `${height - 50}px` }}
      />
    </div>
  );
}

