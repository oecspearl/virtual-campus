"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { createEditor, Descendant, Editor, Transforms, Text } from "slate";
import { Slate, Editable, withReact, RenderElementProps, RenderLeafProps } from "slate-react";
import { withHistory } from "slate-history";

interface SlateEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}

// Custom types
type CustomElement = { type: string; children: CustomText[] };
type CustomText = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };

declare module "slate" {
  interface CustomTypes {
    Editor: import("slate").BaseEditor & import("slate-react").ReactEditor & import("slate-history").HistoryEditor;
    Element: CustomElement;
    Text: CustomText;
  }
}

// Default initial value
const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

// Element renderer
const Element = ({ attributes, children, element }: RenderElementProps) => {
  switch (element.type) {
    case "heading-one":
      return <h1 {...attributes}>{children}</h1>;
    case "heading-two":
      return <h2 {...attributes}>{children}</h2>;
    case "heading-three":
      return <h3 {...attributes}>{children}</h3>;
    case "block-quote":
      return <blockquote {...attributes}>{children}</blockquote>;
    case "bulleted-list":
      return <ul {...attributes}>{children}</ul>;
    case "numbered-list":
      return <ol {...attributes}>{children}</ol>;
    case "list-item":
      return <li {...attributes}>{children}</li>;
    case "code-block":
      return (
        <pre {...attributes} className="bg-gray-100 p-2 rounded">
          <code>{children}</code>
        </pre>
      );
    default:
      return <p {...attributes}>{children}</p>;
  }
};

// Leaf renderer
const Leaf = ({ attributes, children, leaf }: RenderLeafProps) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }
  if (leaf.italic) {
    children = <em>{children}</em>;
  }
  if (leaf.underline) {
    children = <u>{children}</u>;
  }
  return <span {...attributes}>{children}</span>;
};

// Convert HTML to Slate nodes
const htmlToSlate = (html: string): Descendant[] => {
  if (!html || !html.trim()) {
    return initialValue;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const body = doc.body;

    const convertNode = (node: Node): any => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        return text.trim() ? { text: text } : null;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }

      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      const children: Descendant[] = [];

      Array.from(element.childNodes).forEach((child) => {
        const converted = convertNode(child);
        if (converted) {
          if (Array.isArray(converted)) {
            children.push(...converted);
          } else {
            children.push(converted);
          }
        }
      });

      // If no children, add empty text node
      if (children.length === 0) {
        children.push({ text: "" });
      }

      switch (tagName) {
        case "h1":
          return { type: "heading-one", children };
        case "h2":
          return { type: "heading-two", children };
        case "h3":
          return { type: "heading-three", children };
        case "blockquote":
          return { type: "block-quote", children };
        case "ul":
          return { type: "bulleted-list", children };
        case "ol":
          return { type: "numbered-list", children };
        case "li":
          return { type: "list-item", children };
        case "pre":
        case "code":
          return { type: "code-block", children };
        case "p":
        case "div":
          return { type: "paragraph", children };
        default:
          return { type: "paragraph", children };
      }
    };

    const nodes: Descendant[] = [];
    Array.from(body.childNodes).forEach((node) => {
      const converted = convertNode(node);
      if (converted) {
        if (Array.isArray(converted)) {
          nodes.push(...converted);
        } else {
          nodes.push(converted);
        }
      }
    });

    return nodes.length > 0 ? nodes : initialValue;
  } catch (error) {
    console.error("Error converting HTML to Slate:", error);
    return initialValue;
  }
};

// Convert Slate nodes to HTML
const slateToHtml = (nodes: Descendant[]): string => {
  const convertNode = (node: Descendant): string => {
    if (Text.isText(node)) {
      let text = node.text;
      if (node.bold) text = `<strong>${text}</strong>`;
      if (node.italic) text = `<em>${text}</em>`;
      if (node.underline) text = `<u>${text}</u>`;
      return text;
    }

    const element = node as CustomElement;
    const children = element.children.map(convertNode).join("");

    switch (element.type) {
      case "heading-one":
        return `<h1>${children}</h1>`;
      case "heading-two":
        return `<h2>${children}</h2>`;
      case "heading-three":
        return `<h3>${children}</h3>`;
      case "block-quote":
        return `<blockquote>${children}</blockquote>`;
      case "bulleted-list":
        return `<ul>${children}</ul>`;
      case "numbered-list":
        return `<ol>${children}</ol>`;
      case "list-item":
        return `<li>${children}</li>`;
      case "code-block":
        return `<pre><code>${children}</code></pre>`;
      default:
        return `<p>${children}</p>`;
    }
  };

  return nodes.map(convertNode).join("");
};

export default function SlateEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  height = 400,
  showFullscreenButton = true,
}: SlateEditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousValueRef = useRef<string>(value || "");

  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Initialize editor value from HTML
  const [editorValue, setEditorValue] = useState<Descendant[]>(() => {
    if (value && value.trim()) {
      return htmlToSlate(value);
    }
    return initialValue;
  });

  // Handle editor changes
  const handleChange = useCallback(
    (newValue: Descendant[]) => {
      setEditorValue(newValue);
      const html = slateToHtml(newValue);
      if (html !== previousValueRef.current) {
        previousValueRef.current = html;
        onChange(html);
      }
    },
    [onChange]
  );

  // Update editor when value changes externally
  useEffect(() => {
    if (value !== previousValueRef.current && value) {
      const newValue = htmlToSlate(value);
      setEditorValue(newValue);
      previousValueRef.current = value;
    }
  }, [value]);

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

  // Toolbar actions
  const toggleFormat = (format: "bold" | "italic" | "underline") => {
    const isActive = isFormatActive(format);
    Transforms.setNodes(
      editor,
      { [format]: isActive ? null : true },
      { match: (n) => Text.isText(n), split: true }
    );
  };

  const isFormatActive = (format: string) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  const toggleBlock = (blockType: string) => {
    const isActive = isBlockActive(blockType);
    Transforms.unwrapNodes(editor, {
      match: (n) => !Editor.isEditor(n) && (n as any).type !== "paragraph",
      split: true,
    });

    if (isActive) {
      Transforms.setNodes(editor, { type: "paragraph" });
    } else {
      Transforms.setNodes(editor, { type: blockType });
    }
  };

  const isBlockActive = (blockType: string) => {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: selection,
        match: (n) => !Editor.isEditor(n) && (n as any).type === blockType,
      })
    );

    return !!match;
  };

  return (
    <div 
      ref={editorContainerRef}
      className={`relative rounded-lg border border-gray-200 bg-white shadow-sm ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}
      style={isFullscreen ? {} : { minHeight: `${height}px` }}
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2 rounded-t-xl">
        <span className="text-sm font-medium text-gray-700">Slate Editor</span>
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

      {!readOnly && (
        <div className="flex items-center gap-2 p-2 border-b border-gray-200 bg-gray-50">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat("bold");
            }}
            className={`px-3 py-1 text-sm font-semibold hover:bg-gray-200 rounded ${isFormatActive("bold") ? "bg-gray-300" : ""}`}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat("italic");
            }}
            className={`px-3 py-1 text-sm italic hover:bg-gray-200 rounded ${isFormatActive("italic") ? "bg-gray-300" : ""}`}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleFormat("underline");
            }}
            className={`px-3 py-1 text-sm underline hover:bg-gray-200 rounded ${isFormatActive("underline") ? "bg-gray-300" : ""}`}
            title="Underline"
          >
            <u>U</u>
          </button>
          <div className="w-px h-6 bg-gray-300"></div>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock("heading-one");
            }}
            className={`px-3 py-1 text-sm hover:bg-gray-200 rounded ${isBlockActive("heading-one") ? "bg-gray-300" : ""}`}
            title="Heading 1"
          >
            H1
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock("heading-two");
            }}
            className={`px-3 py-1 text-sm hover:bg-gray-200 rounded ${isBlockActive("heading-two") ? "bg-gray-300" : ""}`}
            title="Heading 2"
          >
            H2
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              toggleBlock("block-quote");
            }}
            className={`px-3 py-1 text-sm hover:bg-gray-200 rounded ${isBlockActive("block-quote") ? "bg-gray-300" : ""}`}
            title="Quote"
          >
            "
          </button>
        </div>
      )}

      <div className={isFullscreen ? 'h-full' : ''} style={isFullscreen ? { height: 'calc(100vh - 120px)' } : {}}>
        <Slate editor={editor} initialValue={editorValue} onChange={handleChange}>
          <Editable
            readOnly={readOnly}
            renderElement={Element}
            renderLeaf={Leaf}
            placeholder={placeholder}
            className="p-4 outline-none min-h-[200px]"
            style={{ 
              minHeight: isFullscreen ? 'calc(100vh - 250px)' : `${height - 100}px`,
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          />
        </Slate>
      </div>
    </div>
  );
}

