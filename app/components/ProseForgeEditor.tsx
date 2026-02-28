"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { sanitizeHtml } from '@/lib/sanitize';

interface ProseForgeEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  height?: number;
  showFullscreenButton?: boolean;
}

// Scoped style ID to avoid duplicates
const STYLE_ID = "proseforge-editor-styles";

const PROSEFORGE_STYLES = `
  .pf-shell {
    width: 100%;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid #d2d2d7;
    font-family: 'DM Sans', -apple-system, sans-serif;
  }
  .pf-shell.pf-fullscreen {
    position: fixed;
    inset: 0;
    max-width: none;
    border-radius: 0;
    z-index: 1000;
  }
  .pf-shell.pf-fullscreen .pf-content-wrap {
    max-height: none;
    flex: 1;
  }
  .pf-shell.pf-fullscreen .pf-editor {
    max-width: 800px;
    margin: 0 auto;
  }
  .pf-shell.pf-readonly .pf-toolbar,
  .pf-shell.pf-readonly .pf-menubar,
  .pf-shell.pf-readonly .pf-statusbar { display: none; }

  /* Menubar */
  .pf-menubar {
    display: flex;
    align-items: center;
    height: 36px;
    background: #2c2c2e;
    padding: 0 8px;
    gap: 2px;
    border-bottom: 1px solid #48484a;
    position: relative;
    z-index: 100;
  }
  .pf-menu-item {
    font-size: 12.5px;
    font-weight: 400;
    color: #98989d;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    background: none;
    transition: all 0.15s;
    position: relative;
    white-space: nowrap;
    font-family: inherit;
  }
  .pf-menu-item:hover { color: #e5e5ea; background: #3a3a3c; }
  .pf-menu-item.pf-active { color: #e5e5ea; background: #3a3a3c; }
  .pf-menu-dropdown {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 200px;
    background: #333336;
    border-radius: 6px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.16);
    padding: 4px;
    z-index: 200;
    border: 1px solid #48484a;
  }
  .pf-menu-dropdown.pf-show { display: block; }
  .pf-menu-dropdown-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    font-size: 12.5px;
    color: #e5e5ea;
    border-radius: 4px;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    font-family: inherit;
    transition: background 0.12s;
  }
  .pf-menu-dropdown-item:hover { background: #3a3a3c; }
  .pf-menu-dropdown-item .pf-shortcut {
    color: #98989d;
    font-size: 11px;
    margin-left: 24px;
    font-family: 'JetBrains Mono', monospace;
  }
  .pf-menu-divider {
    height: 1px;
    background: #48484a;
    margin: 4px 8px;
  }

  /* Toolbar */
  .pf-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    padding: 6px 10px;
    background: #2c2c2e;
    border-bottom: 1px solid #48484a;
    min-height: 44px;
  }
  .pf-toolbar-group {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 4px;
  }
  .pf-toolbar-group:not(:last-child)::after {
    content: '';
    width: 1px;
    height: 20px;
    background: #48484a;
    margin-left: 6px;
    flex-shrink: 0;
  }
  .pf-tb-btn {
    width: 32px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: #e5e5ea;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s;
    position: relative;
    flex-shrink: 0;
  }
  .pf-tb-btn:hover { background: #3a3a3c; }
  .pf-tb-btn.pf-active { background: #0a84ff; color: #fff; }
  .pf-tb-btn:disabled { opacity: 0.3; cursor: default; }
  .pf-tb-btn svg { width: 16px; height: 16px; stroke-width: 2; fill: none; stroke: currentColor; }
  .pf-tb-select {
    height: 30px;
    padding: 0 24px 0 8px;
    font-size: 12px;
    font-family: inherit;
    color: #e5e5ea;
    background: #3a3a3c;
    border: 1px solid #48484a;
    border-radius: 4px;
    cursor: pointer;
    outline: none;
    min-width: 110px;
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%2398989d' stroke-width='1.5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
  }
  .pf-tb-select option { background: #333336; color: #e5e5ea; }
  .pf-tb-color {
    width: 32px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
    position: relative;
    transition: background 0.15s;
  }
  .pf-tb-color:hover { background: #3a3a3c; }
  .pf-color-indicator {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 2px solid #e5e5ea;
  }
  .pf-tb-color input[type="color"] {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
  }

  /* Tooltip */
  .pf-tb-btn[data-tooltip]:hover::after,
  .pf-tb-color[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    font-size: 11px;
    color: #fff;
    background: #1c1c1e;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 300;
    pointer-events: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
  }

  /* Editor content */
  .pf-content-wrap {
    flex: 1;
    overflow-y: auto;
    position: relative;
  }
  .pf-content-wrap::-webkit-scrollbar { width: 6px; }
  .pf-content-wrap::-webkit-scrollbar-track { background: transparent; }
  .pf-content-wrap::-webkit-scrollbar-thumb { background: #d2d2d7; border-radius: 3px; }
  .pf-content-wrap::-webkit-scrollbar-thumb:hover { background: #6e6e73; }

  .pf-editor {
    font-family: 'Literata', Georgia, serif;
    font-size: 16px;
    line-height: 1.7;
    color: #1d1d1f;
    padding: 40px 56px;
    outline: none;
    caret-color: #0a84ff;
  }
  .pf-editor p { margin-bottom: 0.75em; }
  .pf-editor p:last-child { margin-bottom: 0; }
  .pf-editor h1 {
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-size: 2em; font-weight: 700; line-height: 1.25;
    margin: 1em 0 0.5em; letter-spacing: -0.02em;
  }
  .pf-editor h2 {
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-size: 1.5em; font-weight: 600; line-height: 1.3;
    margin: 0.9em 0 0.4em; letter-spacing: -0.01em;
  }
  .pf-editor h3 {
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-size: 1.2em; font-weight: 600; line-height: 1.4;
    margin: 0.8em 0 0.35em;
  }
  .pf-editor h4 {
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-size: 1em; font-weight: 600; line-height: 1.4;
    margin: 0.7em 0 0.3em; text-transform: uppercase;
    letter-spacing: 0.04em; color: #6e6e73;
  }
  .pf-editor blockquote {
    border-left: 3px solid #0a84ff;
    margin: 1em 0; padding: 0.5em 0 0.5em 1.5em;
    color: #6e6e73; font-style: italic;
  }
  .pf-editor pre {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13.5px; line-height: 1.6;
    background: #1c1c1e; color: #e5e5ea;
    padding: 16px 20px; border-radius: 6px;
    overflow-x: auto; margin: 1em 0;
  }
  .pf-editor code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.88em; background: rgba(10,132,255,0.08);
    color: #0a84ff; padding: 2px 6px; border-radius: 3px;
  }
  .pf-editor pre code { background: none; color: inherit; padding: 0; border-radius: 0; }
  .pf-editor ul, .pf-editor ol { padding-left: 1.5em; margin: 0.6em 0; }
  .pf-editor li { margin-bottom: 0.3em; }
  .pf-editor li p { margin-bottom: 0.2em; }
  .pf-editor hr { border: none; border-top: 2px solid #d2d2d7; margin: 1.5em 0; }
  .pf-editor img { max-width: 100%; border-radius: 6px; margin: 0.5em 0; cursor: default; }
  .pf-editor a { color: #0a84ff; text-decoration: underline; text-underline-offset: 2px; }
  .pf-editor .text-align-center { text-align: center; }
  .pf-editor .text-align-right { text-align: right; }
  .pf-editor .text-align-justify { text-align: justify; }
  .pf-editor table { border-collapse: collapse; margin: 1em 0; width: 100%; }
  .pf-editor td, .pf-editor th {
    border: 1px solid #d2d2d7; padding: 8px 12px;
    text-align: left; vertical-align: top; min-width: 80px;
  }
  .pf-editor th {
    background: #f5f5f7; font-weight: 600;
    font-family: 'DM Sans', -apple-system, sans-serif; font-size: 0.9em;
  }
  .pf-editor ::selection { background: rgba(10,132,255,0.2); }
  .pf-editor p.pf-empty:first-child::before {
    content: attr(data-placeholder);
    color: #6e6e73; font-style: italic;
    pointer-events: none; float: left; height: 0;
  }

  /* Status bar */
  .pf-statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 28px;
    padding: 0 14px;
    background: #1c1c1e;
    font-size: 11px;
    color: #98989d;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.02em;
    border-top: 1px solid #48484a;
  }
  .pf-statusbar-left, .pf-statusbar-right {
    display: flex; align-items: center; gap: 16px;
  }
  .pf-status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #30d158; display: inline-block; margin-right: 4px;
  }

  /* Find & Replace */
  .pf-find-bar {
    display: none;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: #2c2c2e;
    border-bottom: 1px solid #48484a;
    flex-wrap: wrap;
  }
  .pf-find-bar.pf-show { display: flex; }
  .pf-find-bar input {
    height: 28px; padding: 0 10px; font-size: 13px;
    font-family: inherit; background: #3a3a3c;
    border: 1px solid #48484a; border-radius: 4px;
    color: #e5e5ea; outline: none; min-width: 160px;
  }
  .pf-find-bar input:focus { border-color: #0a84ff; }
  .pf-find-count {
    font-size: 11px; color: #98989d;
    font-family: 'JetBrains Mono', monospace; min-width: 50px;
  }
  .pf-find-bar .pf-tb-btn { width: 28px; height: 28px; }
  .pf-find-bar .pf-btn-ghost {
    padding: 4px 10px; font-size: 11px;
    background: none; color: #98989d;
    border: 1px solid #48484a; border-radius: 4px;
    cursor: pointer; font-family: inherit;
  }
  .pf-find-bar .pf-btn-ghost:hover { background: #3a3a3c; }

  /* Dialog overlay */
  .pf-dialog-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    z-index: 1500;
    align-items: center;
    justify-content: center;
  }
  .pf-dialog-overlay.pf-show { display: flex; }
  .pf-dialog {
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.16);
    padding: 28px;
    width: 440px;
    max-width: 90vw;
    animation: pfDialogIn 0.2s ease;
  }
  @keyframes pfDialogIn {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  .pf-dialog h3 {
    font-family: 'DM Sans', -apple-system, sans-serif;
    font-size: 16px; font-weight: 600; margin-bottom: 20px; color: #1d1d1f;
  }
  .pf-dialog-field { margin-bottom: 14px; }
  .pf-dialog-field label {
    display: block; font-size: 12px; font-weight: 500;
    color: #6e6e73; margin-bottom: 6px;
  }
  .pf-dialog-field input {
    width: 100%; height: 36px; padding: 0 12px; font-size: 14px;
    font-family: inherit; border: 1px solid #d2d2d7;
    border-radius: 6px; outline: none; color: #1d1d1f; background: #fff;
  }
  .pf-dialog-field input:focus {
    border-color: #0a84ff;
    box-shadow: 0 0 0 3px rgba(10,132,255,0.15);
  }
  .pf-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px; }
  .pf-btn {
    padding: 8px 18px; font-size: 13px; font-family: inherit;
    font-weight: 500; border-radius: 6px; border: none; cursor: pointer;
  }
  .pf-btn-primary { background: #0a84ff; color: #fff; }
  .pf-btn-primary:hover { background: #409cff; }
  .pf-btn-cancel { background: none; color: #6e6e73; border: 1px solid #d2d2d7; }
  .pf-btn-cancel:hover { background: #f5f5f7; }

  /* Source view */
  .pf-source-textarea {
    width: 100%;
    height: 100%;
    min-height: inherit;
    padding: 20px 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #e5e5ea;
    background: #1c1c1e;
    border: none;
    outline: none;
    resize: none;
    tab-size: 2;
  }
  .pf-source-textarea.pf-no-wrap {
    white-space: pre;
    overflow-x: auto;
  }

  /* Header label */
  .pf-header-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 36px;
    padding: 0 12px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
  }

  /* AI Enhance Dialog */
  .pf-ai-dialog {
    width: 720px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .pf-ai-mode-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .pf-ai-mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    text-align: center;
  }
  .pf-ai-mode-btn:hover { border-color: #93c5fd; background: #eff6ff; }
  .pf-ai-mode-btn.pf-selected { border-color: #0a84ff; background: #eff6ff; }
  .pf-ai-mode-btn .pf-ai-mode-icon { font-size: 20px; }
  .pf-ai-mode-btn .pf-ai-mode-label {
    font-size: 12px; font-weight: 600; color: #1d1d1f;
  }
  .pf-ai-mode-btn .pf-ai-mode-desc {
    font-size: 10px; color: #6e6e73; line-height: 1.3;
  }
  .pf-ai-instructions-toggle {
    font-size: 12px;
    color: #0a84ff;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    margin-bottom: 8px;
    font-family: inherit;
  }
  .pf-ai-instructions-toggle:hover { text-decoration: underline; }
  .pf-ai-instructions {
    width: 100%;
    min-height: 60px;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    border: 1px solid #d2d2d7;
    border-radius: 6px;
    outline: none;
    resize: vertical;
    color: #1d1d1f;
    margin-bottom: 12px;
  }
  .pf-ai-instructions:focus {
    border-color: #0a84ff;
    box-shadow: 0 0 0 3px rgba(10,132,255,0.15);
  }
  .pf-ai-generate-row {
    display: flex;
    justify-content: center;
    margin-bottom: 16px;
  }
  .pf-ai-generate-btn {
    padding: 10px 28px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pf-ai-generate-btn:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
  .pf-ai-generate-btn:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
  .pf-ai-preview {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    min-height: 150px;
    max-height: 400px;
    overflow-y: auto;
    margin-bottom: 16px;
    position: relative;
  }
  .pf-ai-preview-content {
    padding: 24px 28px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.7;
    color: #1d1d1f;
  }
  .pf-ai-preview-content h2 {
    font-size: 1.4em; font-weight: 700; margin: 1em 0 0.5em;
    color: #0f172a; letter-spacing: -0.01em;
  }
  .pf-ai-preview-content h3 {
    font-size: 1.15em; font-weight: 600; margin: 0.8em 0 0.4em;
    color: #1e293b;
  }
  .pf-ai-preview-content h4 {
    font-size: 1em; font-weight: 600; margin: 0.7em 0 0.3em;
    color: #334155; text-transform: uppercase; letter-spacing: 0.03em; font-size: 0.85em;
  }
  .pf-ai-preview-content p { margin-bottom: 0.75em; }
  .pf-ai-preview-content ul, .pf-ai-preview-content ol { padding-left: 1.5em; margin: 0.5em 0; }
  .pf-ai-preview-content li { margin-bottom: 0.3em; }
  .pf-ai-preview-content mark {
    background: #fef08a; padding: 2px 5px; border-radius: 3px;
  }
  .pf-ai-preview-content blockquote {
    border-left: 3px solid #8b5cf6; background: #f5f3ff;
    padding: 12px 16px; margin: 12px 0; border-radius: 0 6px 6px 0;
    color: #4c1d95; font-style: italic;
  }
  .pf-ai-preview-content blockquote p { margin-bottom: 0.3em; }
  .pf-ai-preview-content code {
    font-family: 'JetBrains Mono', monospace; font-size: 0.88em;
    background: rgba(10,132,255,0.08); color: #0a84ff;
    padding: 2px 5px; border-radius: 3px;
  }
  .pf-ai-preview-content pre {
    background: #1e293b; color: #e2e8f0;
    padding: 14px 18px; border-radius: 8px;
    overflow-x: auto; font-size: 13px; margin: 12px 0;
  }
  .pf-ai-preview-content pre code { background: none; color: inherit; padding: 0; }
  .pf-ai-preview-content table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  .pf-ai-preview-content th, .pf-ai-preview-content td {
    padding: 10px 14px; text-align: left; font-size: 14px;
  }
  .pf-ai-preview-content th {
    font-weight: 600; border-bottom: 2px solid #e2e8f0;
  }
  .pf-ai-preview-content td { border-bottom: 1px solid #f1f5f9; }
  .pf-ai-preview-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
  .pf-ai-preview-content img { max-width: 100%; border-radius: 6px; }
  .pf-ai-preview-content a { color: #3b82f6; text-decoration: underline; }
  .pf-ai-preview-content div { box-sizing: border-box; }
  .pf-ai-preview-content strong { color: #0f172a; }
  .pf-ai-preview-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    color: #98989d;
    font-size: 13px;
    gap: 8px;
  }
  .pf-ai-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;
    gap: 12px;
    color: #6e6e73;
    font-size: 13px;
  }
  .pf-ai-spinner {
    width: 28px; height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: pfSpin 0.7s linear infinite;
  }
  @keyframes pfSpin { to { transform: rotate(360deg); } }
  .pf-ai-error {
    padding: 12px 16px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #dc2626;
    font-size: 13px;
    margin-bottom: 12px;
  }
  .pf-ai-tb-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: #fff !important;
  }
  .pf-ai-tb-btn:hover {
    box-shadow: 0 0 8px rgba(102,126,234,0.5);
  }
`;

export default function ProseForgeEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "Start writing something brilliant...",
  height = 400,
  showFullscreenButton = true,
}: ProseForgeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const menubarRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousValueRef = useRef<string>(value || "");
  const isInternalChange = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findCount, setFindCount] = useState("0 results");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Dialog state
  const [linkDialog, setLinkDialog] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const [tableDialog, setTableDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageTitle, setImageTitle] = useState("");
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // AI Enhance state
  const [aiDialog, setAiDialog] = useState(false);
  const [aiMode, setAiMode] = useState('beautify');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPreview, setAiPreview] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiShowInstructions, setAiShowInstructions] = useState(false);
  const aiSourceHtmlRef = useRef('');
  const aiHadSelectionRef = useRef(false);

  // View state
  const [sourceView, setSourceView] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const sourceRef = useRef<HTMLTextAreaElement>(null);

  // Active menu state
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Toolbar active states
  const [boldActive, setBoldActive] = useState(false);
  const [italicActive, setItalicActive] = useState(false);
  const [underlineActive, setUnderlineActive] = useState(false);
  const [strikeActive, setStrikeActive] = useState(false);

  // Inject styles once
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = PROSEFORGE_STYLES;
      document.head.appendChild(style);
    }
    // Load fonts
    if (!document.querySelector('link[href*="DM+Sans"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&family=JetBrains+Mono:wght@400;500&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;1,7..72,400;1,7..72,500&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // ─── History ───
  const saveHistory = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    if (historyRef.current[historyIndexRef.current] === html) return;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(html);
    if (historyRef.current.length > 200) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      if (editorRef.current) {
        isInternalChange.current = true;
        editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
        emitChange();
      }
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      if (editorRef.current) {
        isInternalChange.current = true;
        editorRef.current.innerHTML = historyRef.current[historyIndexRef.current];
        emitChange();
      }
    }
  }, []);

  // ─── Exec command helper ───
  const exec = useCallback(
    (command: string, val: string | null = null) => {
      editorRef.current?.focus();
      document.execCommand(command, false, val ?? undefined);
      saveHistory();
      emitChange();
    },
    [saveHistory]
  );

  // ─── Emit change to parent ───
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    // Don't emit if it's same as what parent sent
    if (html !== previousValueRef.current) {
      previousValueRef.current = html;
      onChange(html);
    }
    updateCounts();
    updateToolbarState();
  }, [onChange]);

  // ─── Update word/char counts ───
  const updateCounts = useCallback(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.textContent || "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  }, []);

  // ─── Update toolbar active state ───
  const updateToolbarState = useCallback(() => {
    setBoldActive(document.queryCommandState("bold"));
    setItalicActive(document.queryCommandState("italic"));
    setUnderlineActive(document.queryCommandState("underline"));
    setStrikeActive(document.queryCommandState("strikeThrough"));
  }, []);

  // ─── Save/Restore selection for dialogs ───
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, []);

  // ─── Initialize editor ───
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    if (value && value.trim()) {
      el.innerHTML = value;
    } else {
      el.innerHTML = "<p><br></p>";
    }
    previousValueRef.current = el.innerHTML;
    saveHistory();
    updateCounts();
  }, []); // Only on mount

  // ─── Sync external value changes ───
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (!editorRef.current) return;
    if (value !== previousValueRef.current) {
      editorRef.current.innerHTML = value || "<p><br></p>";
      previousValueRef.current = value || "<p><br></p>";
      updateCounts();
    }
  }, [value]);

  // ─── Input handler ───
  const handleInput = useCallback(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => saveHistory(), 300);
    emitChange();
  }, [saveHistory, emitChange]);

  // ─── AI Enhance ───
  const openAiDialog = useCallback(() => {
    setActiveMenu(null);
    saveSelection();

    const sel = window.getSelection();
    let sourceHtml = '';
    let hadSelection = false;

    if (sel && sel.rangeCount && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const fragment = range.cloneContents();
      const temp = document.createElement('div');
      temp.appendChild(fragment);
      sourceHtml = temp.innerHTML;
      hadSelection = true;
    } else {
      sourceHtml = editorRef.current?.innerHTML || '';
    }

    aiSourceHtmlRef.current = sourceHtml;
    aiHadSelectionRef.current = hadSelection;
    setAiPreview('');
    setAiError('');
    setAiLoading(false);
    setAiInstructions('');
    setAiShowInstructions(false);
    setAiMode('beautify');
    setAiDialog(true);
  }, [saveSelection]);

  const runAiEnhance = useCallback(async () => {
    setAiLoading(true);
    setAiError('');
    setAiPreview('');

    try {
      const res = await fetch('/api/ai/content-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: aiSourceHtmlRef.current,
          mode: aiMode,
          instructions: aiInstructions || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }));
        setAiError(data.error || `Request failed (${res.status})`);
        return;
      }

      const data = await res.json();
      setAiPreview(data.enhanced_html || '');
    } catch (err) {
      setAiError('Network error — please try again');
    } finally {
      setAiLoading(false);
    }
  }, [aiMode, aiInstructions]);

  const acceptAiEnhance = useCallback(() => {
    if (!aiPreview || !editorRef.current) return;

    if (aiHadSelectionRef.current) {
      restoreSelection();
      editorRef.current.focus();
      document.execCommand('insertHTML', false, aiPreview);
    } else {
      editorRef.current.innerHTML = aiPreview;
    }

    saveHistory();
    emitChange();
    setAiDialog(false);
  }, [aiPreview, restoreSelection, saveHistory, emitChange]);

  const cancelAiEnhance = useCallback(() => {
    setAiDialog(false);
    setAiPreview('');
    setAiError('');
    setAiLoading(false);
  }, []);

  // ─── Keyboard shortcuts ───
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (mod && e.key === "b") {
        e.preventDefault();
        exec("bold");
      } else if (mod && e.key === "i") {
        e.preventDefault();
        exec("italic");
      } else if (mod && e.key === "u") {
        e.preventDefault();
        exec("underline");
      } else if (mod && e.key === "e") {
        e.preventDefault();
        toggleCode();
      } else if (mod && e.key === "f") {
        e.preventDefault();
        setShowFindReplace((prev) => !prev);
      } else if (e.key === "Tab") {
        e.preventDefault();
        if (e.shiftKey) exec("outdent");
        else exec("indent");
      } else if (e.key === "F11") {
        e.preventDefault();
        setIsFullscreen((f) => !f);
      } else if (mod && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        openAiDialog();
      }
    },
    [undo, redo, exec, openAiDialog]
  );

  // ─── Paste handler ───
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");

      if (html) {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        temp.querySelectorAll("style, script, meta, link").forEach((el) => el.remove());
        temp.querySelectorAll("*").forEach((el) => {
          const allowed = [
            "href", "src", "alt", "title", "colspan", "rowspan",
            "style", "width", "height", "class", "target", "rel",
            "frameborder", "allowfullscreen", "allow", "loading",
            "controls", "type", "referrerpolicy",
          ];
          [...el.attributes].forEach((attr) => {
            if (!allowed.includes(attr.name)) el.removeAttribute(attr.name);
          });
        });
        document.execCommand("insertHTML", false, temp.innerHTML);
      } else {
        document.execCommand("insertText", false, text);
      }
      saveHistory();
      emitChange();
    },
    [saveHistory, emitChange]
  );

  // ─── Selection change ───
  useEffect(() => {
    const handler = () => {
      if (
        editorRef.current &&
        (editorRef.current.contains(document.activeElement) ||
          editorRef.current === document.activeElement)
      ) {
        updateToolbarState();
      }
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [updateToolbarState]);

  // ─── Close menus on outside click ───
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menubarRef.current && menubarRef.current.contains(e.target as Node)) return;
      setActiveMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Inline formatting ───
  const toggleBold = () => exec("bold");
  const toggleItalic = () => exec("italic");
  const toggleUnderline = () => exec("underline");
  const toggleStrike = () => exec("strikeThrough");

  const toggleCode = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node = sel.anchorNode;
    while (node && node !== editorRef.current) {
      if (node.nodeName === "CODE") {
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
        }
        saveHistory();
        emitChange();
        return;
      }
      node = node.parentNode;
    }

    const range = sel.getRangeAt(0);
    if (!range.collapsed) {
      const code = document.createElement("code");
      try {
        range.surroundContents(code);
      } catch {
        const fragment = range.extractContents();
        code.appendChild(fragment);
        range.insertNode(code);
      }
      saveHistory();
      emitChange();
    }
  }, [saveHistory, emitChange]);

  // ─── Block format ───
  const setBlockFormat = (type: string) => {
    editorRef.current?.focus();
    if (type === "paragraph") {
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, type);
    }
    saveHistory();
    emitChange();
  };

  // ─── Alignment ───
  const setAlign = (alignment: string) => {
    const cmds: Record<string, string> = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    };
    exec(cmds[alignment]);
  };

  // ─── Text/Highlight color ───
  const [textColor, setTextColorState] = useState("#1d1d1f");
  const [bgColor, setBgColorState] = useState("#ffd60a");

  const setTextColor = (color: string) => {
    setTextColorState(color);
    exec("foreColor", color);
  };
  const setHighlight = (color: string) => {
    setBgColorState(color);
    exec("hiliteColor", color);
  };

  // ─── Lists ───
  const toggleBulletList = () => exec("insertUnorderedList");
  const toggleOrderedList = () => exec("insertOrderedList");

  // ─── Insert operations ───
  const insertHR = () => exec("insertHorizontalRule");

  const insertBlockquote = () => exec("formatBlock", "blockquote");

  const insertCodeBlock = () => {
    editorRef.current?.focus();
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = "Enter code here...";
    pre.appendChild(code);

    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pre);
      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    saveHistory();
    emitChange();
  };

  // ─── Link dialog ───
  const openLinkDialog = () => {
    setActiveMenu(null);
    saveSelection();
    const sel = window.getSelection();
    setLinkText(sel?.toString() || "");
    setLinkUrl("");
    setLinkTitle("");
    setLinkDialog(true);
  };

  const doInsertLink = () => {
    if (!linkUrl) return;
    restoreSelection();
    editorRef.current?.focus();

    const a = document.createElement("a");
    a.href = linkUrl;
    a.textContent = linkText || linkUrl;
    if (linkTitle) a.title = linkTitle;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(a);
      range.setStartAfter(a);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    saveHistory();
    emitChange();
    setLinkDialog(false);
  };

  // ─── Image dialog ───
  const openImageDialog = () => {
    setActiveMenu(null);
    saveSelection();
    setImageUrl("");
    setImageAlt("");
    setImageTitle("");
    setImageDialog(true);
  };

  const doInsertImage = () => {
    if (!imageUrl) return;
    restoreSelection();
    editorRef.current?.focus();

    const img = document.createElement("img");
    img.src = imageUrl;
    if (imageAlt) img.alt = imageAlt;
    if (imageTitle) img.title = imageTitle;

    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    saveHistory();
    emitChange();
    setImageDialog(false);
  };

  // ─── Table dialog ───
  const openTableDialog = () => {
    setActiveMenu(null);
    saveSelection();
    setTableRows(3);
    setTableCols(3);
    setTableDialog(true);
  };

  const doInsertTable = () => {
    restoreSelection();
    editorRef.current?.focus();

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (let c = 0; c < tableCols; c++) {
      const th = document.createElement("th");
      th.innerHTML = `Header ${c + 1}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let r = 0; r < tableRows - 1; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < tableCols; c++) {
        const td = document.createElement("td");
        td.innerHTML = "<br>";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      table.parentNode?.insertBefore(p, table.nextSibling);
    }
    saveHistory();
    emitChange();
    setTableDialog(false);
  };

  // ─── Find & Replace ───
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const doFind = useCallback(() => {
    if (!editorRef.current || !findInputRef.current) return;
    const query = findInputRef.current.value;
    if (!query) {
      setFindCount("0 results");
      return;
    }
    const text = editorRef.current.textContent || "";
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = text.match(regex);
    setFindCount(matches ? `${matches.length} result${matches.length !== 1 ? "s" : ""}` : "0 results");
  }, []);

  const doReplace = useCallback(() => {
    if (!editorRef.current || !findInputRef.current || !replaceInputRef.current) return;
    const query = findInputRef.current.value;
    const replacement = replaceInputRef.current.value;
    if (!query) return;

    const html = editorRef.current.innerHTML;
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    editorRef.current.innerHTML = html.replace(regex, replacement);
    saveHistory();
    emitChange();
    doFind();
  }, [saveHistory, emitChange, doFind]);

  const doReplaceAll = useCallback(() => {
    if (!editorRef.current || !findInputRef.current || !replaceInputRef.current) return;
    const query = findInputRef.current.value;
    const replacement = replaceInputRef.current.value;
    if (!query) return;

    const html = editorRef.current.innerHTML;
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    editorRef.current.innerHTML = html.replace(regex, replacement);
    saveHistory();
    emitChange();
    doFind();
  }, [saveHistory, emitChange, doFind]);

  // ─── Export ───
  const exportHTML = () => {
    if (!editorRef.current) return;
    const blob = new Blob([editorRef.current.innerHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportText = () => {
    if (!editorRef.current) return;
    const blob = new Blob([editorRef.current.textContent || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const newDoc = () => {
    if (!editorRef.current) return;
    if (editorRef.current.textContent?.trim()) {
      if (!window.confirm("Create a new document? Unsaved changes will be lost.")) return;
    }
    editorRef.current.innerHTML = "<p><br></p>";
    saveHistory();
    emitChange();
  };

  const clearFormatting = () => exec("removeFormat");

  // ─── Source view toggle ───
  const toggleSourceView = useCallback(() => {
    setSourceView((prev) => {
      if (!prev) {
        // Switching TO source view: populate textarea with current editor HTML
        if (sourceRef.current && editorRef.current) {
          sourceRef.current.value = editorRef.current.innerHTML;
        }
      } else {
        // Switching FROM source view: apply textarea HTML back to editor and notify parent
        if (sourceRef.current && editorRef.current) {
          const newHtml = sourceRef.current.value;
          editorRef.current.innerHTML = newHtml;
          previousValueRef.current = newHtml;
          onChange(newHtml);
          saveHistory();
          updateCounts();
        }
      }
      return !prev;
    });
  }, [saveHistory, onChange, updateCounts]);

  const toggleWordWrap = useCallback(() => {
    setWordWrap((prev) => !prev);
  }, []);

  // ─── Menu toggle ───
  const toggleMenu = (menuName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  // Helper: wrap dropdown item actions to stop bubbling and close menu
  const menuAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(null);
    action();
  };

  // ─── SVG Icon helpers ───
  const BoldIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /></svg>
  );
  const ItalicIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" /></svg>
  );
  const UnderlineIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" /><line x1="4" y1="21" x2="20" y2="21" /></svg>
  );
  const StrikeIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M16 4c-.5-1.5-2.5-3-5-3C8 1 5.5 3 5.5 5.5c0 2.5 2 4 5 5.5" /><line x1="3" y1="12" x2="21" y2="12" /><path d="M16 18c0 2-2.5 4-5.5 4S5 20 5 18c0-1.5 1-3 3-4" /></svg>
  );
  const CodeIcon = () => (
    <svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
  );
  const LinkIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
  );
  const ImageIcon = () => (
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
  );
  const TableIcon = () => (
    <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
  );
  const HRIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2.5" /></svg>
  );
  const QuoteIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" /></svg>
  );
  const UndoIcon = () => (
    <svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
  );
  const RedoIcon = () => (
    <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
  );
  const ClearIcon = () => (
    <svg viewBox="0 0 24 24"><path d="M4 7V4h16v3" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /><line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" opacity="0.5" /></svg>
  );
  const FullscreenIcon = () => (
    <svg viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
  );
  const AlignLeftIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
  );
  const AlignCenterIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" /></svg>
  );
  const AlignRightIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>
  );
  const AlignJustifyIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
  );
  const BulletListIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" /></svg>
  );
  const OrderedListIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="3" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="600">1</text><text x="3" y="14" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="600">2</text><text x="3" y="20" fontSize="7" fill="currentColor" stroke="none" fontFamily="sans-serif" fontWeight="600">3</text></svg>
  );
  const IndentIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="3" y1="8" x2="21" y2="8" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="16" x2="21" y2="16" /><line x1="3" y1="20" x2="21" y2="20" /><polyline points="3 12 7 14.5 3 17" /></svg>
  );
  const OutdentIcon = () => (
    <svg viewBox="0 0 24 24"><line x1="3" y1="8" x2="21" y2="8" /><line x1="11" y1="12" x2="21" y2="12" /><line x1="11" y1="16" x2="21" y2="16" /><line x1="3" y1="20" x2="21" y2="20" /><polyline points="7 12 3 14.5 7 17" /></svg>
  );

  if (readOnly) {
    return (
      <div className="pf-shell pf-readonly" ref={shellRef}>
        <div className="pf-header-label">
          <span>Learnboard Native Editor</span>
        </div>
        <div className="pf-content-wrap" style={{ minHeight: `${height}px` }}>
          <div
            className="pf-editor"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value || "") }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`pf-shell ${isFullscreen ? "pf-fullscreen" : ""}`}
        ref={shellRef}
      >
        {/* Header Label */}
        <div className="pf-header-label">
          <span>Learnboard Native Editor</span>
          {showFullscreenButton && (
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="pf-tb-btn"
              style={{ width: 24, height: 24, color: "#374151" }}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Menubar */}
        <div className="pf-menubar" ref={menubarRef}>
          {/* File */}
          <div className="pf-menu-item" onClick={(e) => toggleMenu("file", e)}>
            File
            <div className={`pf-menu-dropdown ${activeMenu === "file" ? "pf-show" : ""}`}>
              <button className="pf-menu-dropdown-item" onClick={menuAction(newDoc)}>New Document <span className="pf-shortcut">Ctrl+N</span></button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(exportHTML)}>Export as HTML</button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(exportText)}>Export as Text</button>
            </div>
          </div>
          {/* Edit */}
          <div className="pf-menu-item" onClick={(e) => toggleMenu("edit", e)}>
            Edit
            <div className={`pf-menu-dropdown ${activeMenu === "edit" ? "pf-show" : ""}`}>
              <button className="pf-menu-dropdown-item" onClick={menuAction(undo)}>Undo <span className="pf-shortcut">Ctrl+Z</span></button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(redo)}>Redo <span className="pf-shortcut">Ctrl+Shift+Z</span></button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(() => setShowFindReplace((p) => !p))}>
                Find & Replace <span className="pf-shortcut">Ctrl+F</span>
              </button>
            </div>
          </div>
          {/* Insert */}
          <div className="pf-menu-item" onClick={(e) => toggleMenu("insert", e)}>
            Insert
            <div className={`pf-menu-dropdown ${activeMenu === "insert" ? "pf-show" : ""}`}>
              <button className="pf-menu-dropdown-item" onClick={menuAction(openLinkDialog)}>Link</button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(openImageDialog)}>Image</button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(openTableDialog)}>Table</button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(insertHR)}>Horizontal Rule</button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(insertCodeBlock)}>Code Block</button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(insertBlockquote)}>Blockquote</button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(openAiDialog)}>AI Enhance... <span className="pf-shortcut">Ctrl+Shift+A</span></button>
            </div>
          </div>
          {/* Format */}
          <div className="pf-menu-item" onClick={(e) => toggleMenu("format", e)}>
            Format
            <div className={`pf-menu-dropdown ${activeMenu === "format" ? "pf-show" : ""}`}>
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleBold)}>Bold <span className="pf-shortcut">Ctrl+B</span></button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleItalic)}>Italic <span className="pf-shortcut">Ctrl+I</span></button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleUnderline)}>Underline <span className="pf-shortcut">Ctrl+U</span></button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleStrike)}>Strikethrough</button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleCode)}>Code <span className="pf-shortcut">Ctrl+E</span></button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(clearFormatting)}>Clear Formatting</button>
            </div>
          </div>
          {/* View */}
          <div className="pf-menu-item" onClick={(e) => toggleMenu("view", e)}>
            View
            <div className={`pf-menu-dropdown ${activeMenu === "view" ? "pf-show" : ""}`}>
              <button className="pf-menu-dropdown-item" onClick={menuAction(() => setIsFullscreen((f) => !f))}>
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"} <span className="pf-shortcut">F11</span>
              </button>
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleSourceView)}>
                {sourceView ? "Rich Text" : "Source Code"}
              </button>
              <div className="pf-menu-divider" />
              <button className="pf-menu-dropdown-item" onClick={menuAction(toggleWordWrap)}>
                {wordWrap ? "Disable Word Wrap" : "Enable Word Wrap"}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="pf-toolbar">
          {/* Block format */}
          <div className="pf-toolbar-group">
            <select
              className="pf-tb-select"
              onChange={(e) => setBlockFormat(e.target.value)}
              defaultValue="paragraph"
              title="Block Format"
            >
              <option value="paragraph">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>
          </div>

          {/* Inline formatting */}
          <div className="pf-toolbar-group">
            <button className={`pf-tb-btn ${boldActive ? "pf-active" : ""}`} onClick={toggleBold} data-tooltip="Bold (Ctrl+B)"><BoldIcon /></button>
            <button className={`pf-tb-btn ${italicActive ? "pf-active" : ""}`} onClick={toggleItalic} data-tooltip="Italic (Ctrl+I)"><ItalicIcon /></button>
            <button className={`pf-tb-btn ${underlineActive ? "pf-active" : ""}`} onClick={toggleUnderline} data-tooltip="Underline (Ctrl+U)"><UnderlineIcon /></button>
            <button className={`pf-tb-btn ${strikeActive ? "pf-active" : ""}`} onClick={toggleStrike} data-tooltip="Strikethrough"><StrikeIcon /></button>
            <button className="pf-tb-btn" onClick={toggleCode} data-tooltip="Inline Code (Ctrl+E)"><CodeIcon /></button>
          </div>

          {/* Text color */}
          <div className="pf-toolbar-group">
            <div className="pf-tb-color" data-tooltip="Text Color">
              <div className="pf-color-indicator" style={{ background: textColor }} />
              <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
            <div className="pf-tb-color" data-tooltip="Highlight">
              <div className="pf-color-indicator" style={{ background: bgColor }} />
              <input type="color" value={bgColor} onChange={(e) => setHighlight(e.target.value)} />
            </div>
          </div>

          {/* Alignment */}
          <div className="pf-toolbar-group">
            <button className="pf-tb-btn" onClick={() => setAlign("left")} data-tooltip="Align Left"><AlignLeftIcon /></button>
            <button className="pf-tb-btn" onClick={() => setAlign("center")} data-tooltip="Align Center"><AlignCenterIcon /></button>
            <button className="pf-tb-btn" onClick={() => setAlign("right")} data-tooltip="Align Right"><AlignRightIcon /></button>
            <button className="pf-tb-btn" onClick={() => setAlign("justify")} data-tooltip="Justify"><AlignJustifyIcon /></button>
          </div>

          {/* Lists */}
          <div className="pf-toolbar-group">
            <button className="pf-tb-btn" onClick={toggleBulletList} data-tooltip="Bullet List"><BulletListIcon /></button>
            <button className="pf-tb-btn" onClick={toggleOrderedList} data-tooltip="Numbered List"><OrderedListIcon /></button>
            <button className="pf-tb-btn" onClick={() => exec("indent")} data-tooltip="Increase Indent"><IndentIcon /></button>
            <button className="pf-tb-btn" onClick={() => exec("outdent")} data-tooltip="Decrease Indent"><OutdentIcon /></button>
          </div>

          {/* Insert actions */}
          <div className="pf-toolbar-group">
            <button className="pf-tb-btn" onClick={openLinkDialog} data-tooltip="Insert Link"><LinkIcon /></button>
            <button className="pf-tb-btn" onClick={openImageDialog} data-tooltip="Insert Image"><ImageIcon /></button>
            <button className="pf-tb-btn" onClick={openTableDialog} data-tooltip="Insert Table"><TableIcon /></button>
            <button className="pf-tb-btn" onClick={insertHR} data-tooltip="Horizontal Rule"><HRIcon /></button>
            <button className="pf-tb-btn" onClick={insertBlockquote} data-tooltip="Blockquote"><QuoteIcon /></button>
          </div>

          {/* Utility */}
          <div className="pf-toolbar-group">
            <button className="pf-tb-btn" onClick={undo} data-tooltip="Undo (Ctrl+Z)"><UndoIcon /></button>
            <button className="pf-tb-btn" onClick={redo} data-tooltip="Redo (Ctrl+Shift+Z)"><RedoIcon /></button>
            <button className="pf-tb-btn" onClick={clearFormatting} data-tooltip="Clear Formatting"><ClearIcon /></button>
            <button className="pf-tb-btn" onClick={() => setIsFullscreen((f) => !f)} data-tooltip="Fullscreen (F11)"><FullscreenIcon /></button>
          </div>

          {/* AI Enhance */}
          <div className="pf-toolbar-group">
            <button className="pf-tb-btn pf-ai-tb-btn" onClick={openAiDialog} data-tooltip="AI Enhance (Ctrl+Shift+A)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                <path d="M19 15l1.04 3.13L23 19l-2.96.87L19 23l-1.04-3.13L15 19l2.96-.87L19 15z" opacity="0.6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Find & Replace Bar */}
        {showFindReplace && (
          <div className="pf-find-bar pf-show">
            <input ref={findInputRef} type="text" placeholder="Find..." onInput={doFind} />
            <span className="pf-find-count">{findCount}</span>
            <input ref={replaceInputRef} type="text" placeholder="Replace..." />
            <button className="pf-btn-ghost" onClick={doReplace}>Replace</button>
            <button className="pf-btn-ghost" onClick={doReplaceAll}>All</button>
            <button
              className="pf-tb-btn"
              onClick={() => setShowFindReplace(false)}
              style={{ marginLeft: "auto" }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}

        {/* Editor Area */}
        <div
          className="pf-content-wrap"
          style={{
            minHeight: isFullscreen ? undefined : `${height}px`,
            maxHeight: isFullscreen ? undefined : "70vh",
          }}
        >
          {/* Source textarea - always mounted, hidden when not in source view */}
          <textarea
            ref={sourceRef}
            className={`pf-source-textarea ${!wordWrap ? "pf-no-wrap" : ""}`}
            onChange={(e) => {
              // Sync source edits to the hidden editor div and notify parent
              if (editorRef.current) {
                editorRef.current.innerHTML = e.target.value;
              }
              previousValueRef.current = e.target.value;
              onChange(e.target.value);
            }}
            spellCheck={false}
            style={{
              display: sourceView ? "block" : "none",
              minHeight: isFullscreen ? "calc(100vh - 250px)" : `${height - 80}px`,
            }}
          />
          {/* Rich text editor - always mounted, hidden when in source view */}
          <div
            ref={editorRef}
            className="pf-editor"
            contentEditable={!sourceView}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            spellCheck
            data-placeholder={placeholder}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onMouseUp={updateToolbarState}
            onKeyUp={updateToolbarState}
            style={{
              display: sourceView ? "none" : "block",
              minHeight: isFullscreen ? "calc(100vh - 250px)" : `${height - 80}px`,
            }}
          />
        </div>

        {/* Status Bar */}
        <div className="pf-statusbar">
          <div className="pf-statusbar-left">
            <span><span className="pf-status-dot" />{sourceView ? "Source" : "Ready"}</span>
            <span>{wordCount} words</span>
            <span>{charCount} chars</span>
          </div>
          <div className="pf-statusbar-right">
            {sourceView && <span>HTML</span>}
            {!wordWrap && <span>No Wrap</span>}
            <span>Learnboard</span>
          </div>
        </div>
      </div>

      {/* Link Dialog */}
      {linkDialog && (
        <div className="pf-dialog-overlay pf-show" onClick={() => setLinkDialog(false)}>
          <div className="pf-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Insert Link</h3>
            <div className="pf-dialog-field">
              <label>URL</label>
              <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com" autoFocus />
            </div>
            <div className="pf-dialog-field">
              <label>Text (optional)</label>
              <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Link text" />
            </div>
            <div className="pf-dialog-field">
              <label>Title (optional)</label>
              <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Tooltip text" />
            </div>
            <div className="pf-dialog-actions">
              <button className="pf-btn pf-btn-cancel" onClick={() => setLinkDialog(false)}>Cancel</button>
              <button className="pf-btn pf-btn-primary" onClick={doInsertLink}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {imageDialog && (
        <div className="pf-dialog-overlay pf-show" onClick={() => setImageDialog(false)}>
          <div className="pf-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Insert Image</h3>
            <div className="pf-dialog-field">
              <label>Image URL</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" autoFocus />
            </div>
            <div className="pf-dialog-field">
              <label>Alt Text</label>
              <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Describe the image" />
            </div>
            <div className="pf-dialog-field">
              <label>Title (optional)</label>
              <input type="text" value={imageTitle} onChange={(e) => setImageTitle(e.target.value)} placeholder="Tooltip text" />
            </div>
            <div className="pf-dialog-actions">
              <button className="pf-btn pf-btn-cancel" onClick={() => setImageDialog(false)}>Cancel</button>
              <button className="pf-btn pf-btn-primary" onClick={doInsertImage}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* Table Dialog */}
      {tableDialog && (
        <div className="pf-dialog-overlay pf-show" onClick={() => setTableDialog(false)}>
          <div className="pf-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Insert Table</h3>
            <div className="pf-dialog-field">
              <label>Rows</label>
              <input type="number" value={tableRows} onChange={(e) => setTableRows(Number(e.target.value))} min={1} max={20} />
            </div>
            <div className="pf-dialog-field">
              <label>Columns</label>
              <input type="number" value={tableCols} onChange={(e) => setTableCols(Number(e.target.value))} min={1} max={10} />
            </div>
            <div className="pf-dialog-actions">
              <button className="pf-btn pf-btn-cancel" onClick={() => setTableDialog(false)}>Cancel</button>
              <button className="pf-btn pf-btn-primary" onClick={doInsertTable}>Insert</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Enhance Dialog */}
      {aiDialog && (
        <div className="pf-dialog-overlay pf-show" onClick={cancelAiEnhance}>
          <div className="pf-dialog pf-ai-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#667eea" strokeWidth="2">
                <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
              </svg>
              AI Content Enhance
              {aiHadSelectionRef.current && (
                <span style={{ fontSize: 11, color: '#6e6e73', fontWeight: 400, marginLeft: 4 }}>(selection)</span>
              )}
            </h3>

            {/* Mode selector */}
            <div className="pf-ai-mode-grid">
              {[
                { key: 'beautify', icon: '✨', label: 'Beautify', desc: 'Styled headings, highlights & callouts' },
                { key: 'lesson_format', icon: '📖', label: 'Lesson Format', desc: 'Rich textbook-style layout' },
                { key: 'add_visuals', icon: '🎨', label: 'Add Visuals', desc: 'Add boxes, grids & styled lists' },
                { key: 'expand', icon: '📚', label: 'Expand', desc: 'Add detail, examples & tables' },
                { key: 'summarize', icon: '📋', label: 'Summarize', desc: 'Key takeaways box & highlights' },
                { key: 'simplify', icon: '📝', label: 'Simplify', desc: 'Simpler text, keep styling' },
                { key: 'fix_grammar', icon: '✓', label: 'Fix Grammar', desc: 'Correct grammar & spelling' },
              ].map(m => (
                <button
                  key={m.key}
                  className={`pf-ai-mode-btn ${aiMode === m.key ? 'pf-selected' : ''}`}
                  onClick={() => setAiMode(m.key)}
                  type="button"
                >
                  <span className="pf-ai-mode-icon">{m.icon}</span>
                  <span className="pf-ai-mode-label">{m.label}</span>
                  <span className="pf-ai-mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom instructions (collapsible) */}
            <button
              className="pf-ai-instructions-toggle"
              onClick={() => setAiShowInstructions(p => !p)}
              type="button"
            >
              {aiShowInstructions ? '− Hide custom instructions' : '+ Add custom instructions'}
            </button>
            {aiShowInstructions && (
              <textarea
                className="pf-ai-instructions"
                placeholder="E.g., &quot;Use bullet points for all key terms&quot; or &quot;Add a summary at the end&quot;"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
              />
            )}

            {/* Generate button */}
            <div className="pf-ai-generate-row">
              <button
                className="pf-ai-generate-btn"
                onClick={runAiEnhance}
                disabled={aiLoading}
                type="button"
              >
                {aiLoading ? (
                  <>
                    <span className="pf-ai-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Enhancing...
                  </>
                ) : aiPreview ? (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg>
                    Regenerate
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                    </svg>
                    Generate
                  </>
                )}
              </button>
            </div>

            {/* Error */}
            {aiError && <div className="pf-ai-error">{aiError}</div>}

            {/* Preview area */}
            <div className="pf-ai-preview">
              {aiLoading ? (
                <div className="pf-ai-loading">
                  <div className="pf-ai-spinner" />
                  <span>AI is enhancing your content...</span>
                </div>
              ) : aiPreview ? (
                <div className="pf-ai-preview-content" dangerouslySetInnerHTML={{ __html: aiPreview }} />
              ) : (
                <div className="pf-ai-preview-empty">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
                  </svg>
                  Select a mode and click Generate to preview
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pf-dialog-actions">
              <button className="pf-btn pf-btn-cancel" onClick={cancelAiEnhance} type="button">Cancel</button>
              {aiPreview && (
                <button className="pf-btn pf-btn-primary" onClick={acceptAiEnhance} type="button">
                  Accept & Insert
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
