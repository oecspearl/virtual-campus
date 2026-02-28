"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import TinyMCEEditor from "./TinyMCEEditor";

// Dynamically import editors to reduce initial bundle size
const TinyMCEEditorDynamic = dynamic(() => import("./TinyMCEEditor"), {
  ssr: false,
});

const EditorJSEditorDynamic = dynamic(() => import("./EditorJSEditor"), {
  ssr: false,
});

const LexicalEditorDynamic = dynamic(() => import("./LexicalEditor"), {
  ssr: false,
});

const SlateEditorDynamic = dynamic(() => import("./SlateEditor"), {
  ssr: false,
});

const ProseForgeEditorDynamic = dynamic(() => import("./ProseForgeEditor"), {
  ssr: false,
});

interface TextEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
  editorType?: "tinymce" | "editorjs" | "lexical" | "slate" | "proseforge" | "auto"; // "auto" will use system preference
}

// Cache for editor preference
let cachedEditorType: string | null = null;

async function getEditorPreference(): Promise<"tinymce" | "editorjs" | "lexical" | "slate" | "proseforge"> {
  // Check cache first
  if (["tinymce", "editorjs", "lexical", "slate", "proseforge"].includes(cachedEditorType || "")) {
    return cachedEditorType as "tinymce" | "editorjs" | "lexical" | "slate" | "proseforge";
  }

  try {
    const response = await fetch("/api/admin/settings/editor", {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (response.ok) {
      const data = await response.json();
      const editorType = data.editorType || "proseforge";
      // Filter out removed editors - migrate to proseforge
      if (editorType === "ckeditor5" || editorType === "quill" || editorType === "learnboard") {
        cachedEditorType = "proseforge";
        return "proseforge";
      }
      if (["tinymce", "editorjs", "lexical", "slate", "proseforge"].includes(editorType)) {
        cachedEditorType = editorType;
        return editorType as "tinymce" | "editorjs" | "lexical" | "slate" | "proseforge";
      }
      cachedEditorType = "proseforge";
      return "proseforge";
    }
  } catch (error) {
    console.error("Failed to fetch editor preference:", error);
  }

  // Default to Learnboard Native Editor if fetch fails
  cachedEditorType = "proseforge";
  return "proseforge";
}

export default function TextEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start typing...",
  height = 400,
  showFullscreenButton = true,
  editorType = "auto",
}: TextEditorProps) {
  const [selectedEditorType, setSelectedEditorType] = useState<"tinymce" | "editorjs" | "lexical" | "slate" | "proseforge">("proseforge");
  const [loading, setLoading] = useState(editorType === "auto");

  useEffect(() => {
    if (editorType === "auto") {
      getEditorPreference().then((type) => {
        setSelectedEditorType(type);
        setLoading(false);
      });
    } else {
      setSelectedEditorType(editorType);
      setLoading(false);
    }
  }, [editorType]);

  // Clear cache when component unmounts (for testing different editors)
  useEffect(() => {
    return () => {
      // Don't clear cache on unmount, keep it for performance
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 flex items-center justify-center" style={{ minHeight: `${height}px` }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  const editorProps = {
    value,
    onChange,
    readOnly,
    placeholder,
    height,
    showFullscreenButton,
  };

  if (selectedEditorType === "editorjs") {
    return <EditorJSEditorDynamic {...editorProps} />;
  }

  if (selectedEditorType === "lexical") {
    return <LexicalEditorDynamic {...editorProps} />;
  }

  if (selectedEditorType === "slate") {
    return <SlateEditorDynamic {...editorProps} />;
  }

  if (selectedEditorType === "tinymce") {
    return <TinyMCEEditorDynamic {...editorProps} />;
  }

  return <ProseForgeEditorDynamic {...editorProps} />;
}

// Export function to clear editor preference cache (useful for admin changes)
export function clearEditorPreferenceCache() {
  cachedEditorType = null;
}
