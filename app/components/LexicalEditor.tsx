"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { LinkNode } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $getSelection, $isRangeSelection, EditorState } from "lexical";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $insertNodes } from "lexical";
import { $createParagraphNode, $createTextNode } from "lexical";
import { $setSelection } from "lexical";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";

interface LexicalEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}

// Toolbar component
function ToolbarPlugin({ readOnly, onEditorReady }: { readOnly?: boolean; onEditorReady?: (editor: any) => void }) {
  const [editor] = useLexicalComposerContext();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  const handleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatText = (format: any) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.formatText(format);
      }
    });
  };

  const formatHeading = (headingSize: "h1" | "h2" | "h3") => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // This is a simplified version - you'd need proper heading nodes
        // For now, we'll just format as bold for headings
      }
    });
  };

  if (readOnly) return null;

  return (
    <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
      <button
        onClick={() => formatText("bold")}
        className="px-3 py-1 text-sm font-semibold hover:bg-gray-200 rounded"
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => formatText("italic")}
        className="px-3 py-1 text-sm italic hover:bg-gray-200 rounded"
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => formatText("underline")}
        className="px-3 py-1 text-sm underline hover:bg-gray-200 rounded"
        title="Underline"
      >
        <u>U</u>
      </button>
      <div className="w-px h-6 bg-gray-300"></div>
      <button
        onClick={handleFullscreen}
        className="px-3 py-1 text-sm hover:bg-gray-200 rounded"
        title="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
}

// Image upload plugin
function ImageUploadPlugin() {
  const [editor] = useLexicalComposerContext();

  const handleImageUpload = async (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert(`File size exceeds 10MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      const imageUrl = data.url;

      // Insert image into editor
      editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode(`![Image](${imageUrl})`);
        paragraph.append(textNode);
        root.append(paragraph);
      });
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image. Please try again.");
    }
  };

  return null; // Image upload would be handled via toolbar button
}

const theme = {
  paragraph: "mb-2",
  heading: {
    h1: "text-3xl font-bold mb-4",
    h2: "text-2xl font-bold mb-3",
    h3: "text-xl font-bold mb-2",
  },
  list: {
    nested: {
      listitem: "list-none",
    },
    ol: "list-decimal ml-6",
    ul: "list-disc ml-6",
    listitem: "mb-1",
  },
  quote: "border-l-4 border-gray-300 pl-4 italic my-4",
  code: "bg-gray-100 p-2 rounded font-mono text-sm",
  link: "text-blue-600 underline",
};

function onError(error: Error) {
  console.error("Lexical error:", error);
}

export default function LexicalEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  height = 400,
  showFullscreenButton = true,
}: LexicalEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousValueRef = useRef<string>(value || "");

  const initialConfig = {
    namespace: "LexicalEditor",
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      LinkNode,
    ],
    editable: !readOnly,
  };

  // Store editor reference
  const [editorInstance, setEditorInstance] = useState<any>(null);

  const handleChange = useCallback((editorState: EditorState, editor: any) => {
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editor, null);
      if (htmlString !== previousValueRef.current) {
        previousValueRef.current = htmlString;
        onChange(htmlString);
      }
    });
  }, [onChange]);

  // Update editor when value changes externally
  useEffect(() => {
    if (value !== previousValueRef.current && editorInstance) {
      editorInstance.update(() => {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value, "text/html");
        const nodes = $generateNodesFromDOM(editorInstance, dom);
        const root = $getRoot();
        root.clear();
        root.append(...nodes);
      });
      previousValueRef.current = value;
    }
  }, [value, editorInstance]);

  // Handle fullscreen
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

  return (
    <div 
      ref={editorContainerRef}
      className={`relative rounded-xl border border-gray-200 bg-white shadow-sm ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}
      style={isFullscreen ? {} : { minHeight: `${height}px` }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 rounded-t-xl">
        <span className="text-sm font-medium text-gray-700">Lexical Editor</span>
        {showFullscreenButton && !readOnly && (
          <button
            onClick={() => {
              if (!isFullscreen) {
                editorContainerRef.current?.requestFullscreen?.();
              } else {
                document.exitFullscreen?.();
              }
            }}
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

      <div className={isFullscreen ? 'h-full' : ''} style={isFullscreen ? { height: 'calc(100vh - 60px)' } : {}}>
        <LexicalComposer initialConfig={initialConfig}>
          <div className="editor-container" style={{ minHeight: isFullscreen ? 'calc(100vh - 200px)' : `${height - 50}px` }}>
            <ToolbarPlugin readOnly={readOnly} />
            <div className="editor-inner relative">
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className="editor-input p-4 outline-none min-h-[200px]"
                    style={{ minHeight: isFullscreen ? 'calc(100vh - 250px)' : `${height - 100}px` }}
                  />
                }
                placeholder={
                  <div className="editor-placeholder absolute top-4 left-4 text-gray-400 pointer-events-none">
                    {placeholder}
                  </div>
                }
                ErrorBoundary={LexicalErrorBoundary as any}
              />
              <OnChangePlugin onChange={(editorState, editor) => {
                handleChange(editorState, editor);
                if (!editorInstance) {
                  setEditorInstance(editor);
                }
              }} />
              <HistoryPlugin />
              {!readOnly && <AutoFocusPlugin />}
              <LinkPlugin />
              <ListPlugin />
              <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
              <ImageUploadPlugin />
            </div>
          </div>
        </LexicalComposer>
      </div>

      <style jsx global>{`
        .editor-input {
          font-size: 14px;
          line-height: 1.6;
        }
        .editor-input:focus {
          outline: none;
        }
        .editor-placeholder {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

