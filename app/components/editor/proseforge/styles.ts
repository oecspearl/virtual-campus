// Scoped style ID to avoid duplicates
export const STYLE_ID = "proseforge-editor-styles";

export const PROSEFORGE_STYLES = `
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
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .pf-ai-spinner::before,
  .pf-ai-spinner::after,
  .pf-ai-spinner span {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #667eea;
    animation: pfDotBounce 1.4s ease-in-out infinite;
  }
  .pf-ai-spinner::after { animation-delay: 0.16s; }
  .pf-ai-spinner span { animation-delay: 0.32s; }
  @keyframes pfDotBounce {
    0%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-8px); }
  }
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
