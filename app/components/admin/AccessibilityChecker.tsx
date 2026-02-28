'use client';

import { useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  Eye,
  FileText,
  Image,
  Link as LinkIcon,
  Type,
  Palette,
} from 'lucide-react';
import { ColorContrast } from '@/lib/accessibility-utils';

interface AccessibilityIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  rule: string;
  element: string;
  message: string;
  fix?: string;
  wcag?: string;
}

interface AccessibilityReport {
  score: number;
  issues: AccessibilityIssue[];
  checkedAt: string;
}

interface AccessibilityCheckerProps {
  content: string;  // HTML content to check
  contentType?: 'lesson' | 'course' | 'announcement' | 'page';
  contentId?: string;
  onReportGenerated?: (report: AccessibilityReport) => void;
  className?: string;
}

// Accessibility rules to check
const ACCESSIBILITY_RULES = {
  // Images
  'img-alt': {
    name: 'Images must have alt text',
    wcag: '1.1.1',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];
      const images = doc.querySelectorAll('img');

      images.forEach((img, index) => {
        const alt = img.getAttribute('alt');
        if (alt === null) {
          issues.push({
            id: `img-alt-${index}`,
            type: 'error',
            rule: 'img-alt',
            element: `img[src="${img.getAttribute('src')?.substring(0, 50)}..."]`,
            message: 'Image is missing alt attribute',
            fix: 'Add an alt attribute describing the image content, or alt="" for decorative images',
            wcag: '1.1.1',
          });
        } else if (alt === '' && !img.getAttribute('role')) {
          issues.push({
            id: `img-alt-empty-${index}`,
            type: 'info',
            rule: 'img-alt',
            element: `img[src="${img.getAttribute('src')?.substring(0, 50)}..."]`,
            message: 'Image has empty alt text. Verify this is a decorative image.',
            fix: 'If image conveys information, add descriptive alt text',
            wcag: '1.1.1',
          });
        }
      });

      return issues;
    },
  },

  // Links
  'link-text': {
    name: 'Links must have descriptive text',
    wcag: '2.4.4',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];
      const links = doc.querySelectorAll('a');
      const genericTexts = ['click here', 'here', 'read more', 'learn more', 'link', 'more'];

      links.forEach((link, index) => {
        const text = link.textContent?.trim().toLowerCase() || '';
        const ariaLabel = link.getAttribute('aria-label');

        if (!text && !ariaLabel && !link.querySelector('img[alt]')) {
          issues.push({
            id: `link-empty-${index}`,
            type: 'error',
            rule: 'link-text',
            element: `a[href="${link.getAttribute('href')?.substring(0, 50)}..."]`,
            message: 'Link has no accessible text',
            fix: 'Add link text or aria-label',
            wcag: '2.4.4',
          });
        } else if (genericTexts.includes(text)) {
          issues.push({
            id: `link-generic-${index}`,
            type: 'warning',
            rule: 'link-text',
            element: `a: "${text}"`,
            message: `Link text "${text}" is not descriptive`,
            fix: 'Use descriptive text that explains where the link goes',
            wcag: '2.4.4',
          });
        }
      });

      return issues;
    },
  },

  // Headings
  'heading-order': {
    name: 'Headings must be in logical order',
    wcag: '1.3.1',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];
      const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;

      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName[1]);

        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push({
            id: `heading-skip-${index}`,
            type: 'warning',
            rule: 'heading-order',
            element: `${heading.tagName}: "${heading.textContent?.substring(0, 30)}..."`,
            message: `Heading level skipped from H${lastLevel} to H${level}`,
            fix: `Use H${lastLevel + 1} instead, or add missing heading levels`,
            wcag: '1.3.1',
          });
        }

        lastLevel = level;
      });

      // Check for missing h1
      if (!doc.querySelector('h1')) {
        issues.push({
          id: 'heading-no-h1',
          type: 'warning',
          rule: 'heading-order',
          element: 'document',
          message: 'Page has no H1 heading',
          fix: 'Add an H1 heading as the main page title',
          wcag: '1.3.1',
        });
      }

      return issues;
    },
  },

  // Color contrast (basic check for inline styles)
  'color-contrast': {
    name: 'Text must have sufficient color contrast',
    wcag: '1.4.3',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];
      const elements = doc.querySelectorAll('[style*="color"]');

      elements.forEach((el, index) => {
        const style = el.getAttribute('style') || '';
        const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/i);
        const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i);

        if (colorMatch && bgMatch) {
          // Basic hex color extraction (simplified)
          const textColor = colorMatch[1].trim();
          const bgColor = bgMatch[1].trim();

          if (textColor.startsWith('#') && bgColor.startsWith('#')) {
            const ratio = ColorContrast.getContrastRatio(textColor, bgColor);
            if (ratio < 4.5) {
              issues.push({
                id: `contrast-${index}`,
                type: 'error',
                rule: 'color-contrast',
                element: `${el.tagName.toLowerCase()}: "${el.textContent?.substring(0, 20)}..."`,
                message: `Contrast ratio ${ratio.toFixed(2)}:1 is below 4.5:1 minimum`,
                fix: 'Increase contrast between text and background colors',
                wcag: '1.4.3',
              });
            }
          }
        }
      });

      return issues;
    },
  },

  // Form labels
  'form-labels': {
    name: 'Form inputs must have labels',
    wcag: '1.3.1',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];
      const inputs = doc.querySelectorAll('input, select, textarea');

      inputs.forEach((input, index) => {
        const type = input.getAttribute('type');
        if (type === 'hidden' || type === 'submit' || type === 'button') return;

        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        const hasLabel = id && doc.querySelector(`label[for="${id}"]`);
        const hasPlaceholder = input.getAttribute('placeholder');

        if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
          issues.push({
            id: `form-label-${index}`,
            type: hasPlaceholder ? 'warning' : 'error',
            rule: 'form-labels',
            element: `${input.tagName.toLowerCase()}[type="${type || 'text'}"]`,
            message: hasPlaceholder
              ? 'Input uses placeholder instead of label (placeholder disappears when typing)'
              : 'Form input has no associated label',
            fix: 'Add a <label> element with for attribute, or use aria-label',
            wcag: '1.3.1',
          });
        }
      });

      return issues;
    },
  },

  // Tables
  'table-headers': {
    name: 'Tables must have headers',
    wcag: '1.3.1',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];
      const tables = doc.querySelectorAll('table');

      tables.forEach((table, index) => {
        const hasHeaders = table.querySelector('th');
        const hasCaption = table.querySelector('caption');

        if (!hasHeaders) {
          issues.push({
            id: `table-headers-${index}`,
            type: 'error',
            rule: 'table-headers',
            element: `table (${index + 1})`,
            message: 'Table has no header cells (th elements)',
            fix: 'Add <th> elements to identify column/row headers',
            wcag: '1.3.1',
          });
        }

        if (!hasCaption && !table.getAttribute('aria-label')) {
          issues.push({
            id: `table-caption-${index}`,
            type: 'info',
            rule: 'table-headers',
            element: `table (${index + 1})`,
            message: 'Table has no caption or aria-label',
            fix: 'Add a <caption> element or aria-label to describe the table',
            wcag: '1.3.1',
          });
        }
      });

      return issues;
    },
  },

  // Language
  'lang-attribute': {
    name: 'Content should specify language',
    wcag: '3.1.1',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];

      // Check for lang attribute changes within content
      const langElements = doc.querySelectorAll('[lang]');
      langElements.forEach((el, index) => {
        const lang = el.getAttribute('lang');
        if (lang && lang.length < 2) {
          issues.push({
            id: `lang-invalid-${index}`,
            type: 'warning',
            rule: 'lang-attribute',
            element: `${el.tagName.toLowerCase()}[lang="${lang}"]`,
            message: 'Invalid language code',
            fix: 'Use valid ISO 639-1 language codes (e.g., "en", "es", "fr")',
            wcag: '3.1.1',
          });
        }
      });

      return issues;
    },
  },

  // Video/Audio
  'media-alternatives': {
    name: 'Media must have alternatives',
    wcag: '1.2.1',
    check: (doc: Document): AccessibilityIssue[] => {
      const issues: AccessibilityIssue[] = [];

      // Check videos
      const videos = doc.querySelectorAll('video');
      videos.forEach((video, index) => {
        const hasTrack = video.querySelector('track[kind="captions"], track[kind="subtitles"]');
        if (!hasTrack) {
          issues.push({
            id: `video-captions-${index}`,
            type: 'error',
            rule: 'media-alternatives',
            element: 'video',
            message: 'Video has no captions or subtitles',
            fix: 'Add a <track> element with captions',
            wcag: '1.2.1',
          });
        }
      });

      // Check audio
      const audios = doc.querySelectorAll('audio');
      audios.forEach((audio, index) => {
        issues.push({
          id: `audio-transcript-${index}`,
          type: 'info',
          rule: 'media-alternatives',
          element: 'audio',
          message: 'Verify that a transcript is available for this audio content',
          fix: 'Provide a text transcript of the audio content',
          wcag: '1.2.1',
        });
      });

      // Check iframes (likely embedded videos)
      const iframes = doc.querySelectorAll('iframe');
      iframes.forEach((iframe, index) => {
        const src = iframe.getAttribute('src') || '';
        if (src.includes('youtube') || src.includes('vimeo')) {
          issues.push({
            id: `iframe-video-${index}`,
            type: 'info',
            rule: 'media-alternatives',
            element: 'iframe (embedded video)',
            message: 'Verify embedded video has captions enabled',
            fix: 'Enable captions in the video platform or provide a transcript',
            wcag: '1.2.1',
          });
        }
      });

      return issues;
    },
  },
};

export default function AccessibilityChecker({
  content,
  contentType = 'lesson',
  contentId,
  onReportGenerated,
  className = '',
}: AccessibilityCheckerProps) {
  const [report, setReport] = useState<AccessibilityReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const runAccessibilityCheck = useCallback(() => {
    setIsChecking(true);

    // Parse HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');

    // Run all checks
    const allIssues: AccessibilityIssue[] = [];

    Object.values(ACCESSIBILITY_RULES).forEach(rule => {
      const issues = rule.check(doc);
      allIssues.push(...issues);
    });

    // Calculate score (100 - penalties)
    let score = 100;
    allIssues.forEach(issue => {
      if (issue.type === 'error') score -= 10;
      else if (issue.type === 'warning') score -= 5;
      else score -= 1;
    });
    score = Math.max(0, score);

    const newReport: AccessibilityReport = {
      score,
      issues: allIssues,
      checkedAt: new Date().toISOString(),
    };

    setReport(newReport);
    setIsChecking(false);

    if (onReportGenerated) {
      onReportGenerated(newReport);
    }

    // Save report to API if contentId provided
    if (contentId) {
      fetch('/api/accessibility/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          issues: allIssues,
          score,
        }),
      }).catch(console.error);
    }
  }, [content, contentType, contentId, onReportGenerated]);

  const toggleIssue = (id: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getIssueIcon = (type: 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getRuleIcon = (rule: string) => {
    if (rule.includes('img')) return <Image className="w-4 h-4" />;
    if (rule.includes('link')) return <LinkIcon className="w-4 h-4" />;
    if (rule.includes('heading')) return <Type className="w-4 h-4" />;
    if (rule.includes('color')) return <Palette className="w-4 h-4" />;
    if (rule.includes('form')) return <FileText className="w-4 h-4" />;
    return <Eye className="w-4 h-4" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const errorCount = report?.issues.filter(i => i.type === 'error').length || 0;
  const warningCount = report?.issues.filter(i => i.type === 'warning').length || 0;
  const infoCount = report?.issues.filter(i => i.type === 'info').length || 0;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Accessibility Checker</h3>
          </div>
          <button
            onClick={runAccessibilityCheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Accessibility'}
          </button>
        </div>

        {/* Score display */}
        {report && (
          <div className="mt-4 flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg font-bold text-2xl ${getScoreColor(report.score)}`}>
              {report.score}/100
            </div>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="w-4 h-4" /> {errorCount} errors
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="w-4 h-4" /> {warningCount} warnings
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <Info className="w-4 h-4" /> {infoCount} suggestions
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Issues list */}
      {report && (
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {report.issues.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-green-700 font-medium">No accessibility issues found!</p>
              <p className="text-gray-500 text-sm mt-1">Your content meets WCAG 2.1 AA guidelines.</p>
            </div>
          ) : (
            report.issues.map(issue => (
              <div key={issue.id} className="p-3 hover:bg-gray-50">
                <button
                  onClick={() => toggleIssue(issue.id)}
                  className="w-full text-left flex items-start gap-3"
                >
                  {getIssueIcon(issue.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{issue.message}</span>
                      {issue.wcag && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          WCAG {issue.wcag}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {getRuleIcon(issue.rule)}
                      <span className="truncate">{issue.element}</span>
                    </div>

                    {expandedIssues.has(issue.id) && issue.fix && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                        <strong>How to fix:</strong> {issue.fix}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* No report yet */}
      {!report && !isChecking && (
        <div className="p-8 text-center text-gray-500">
          <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Click "Check Accessibility" to analyze your content</p>
          <p className="text-sm mt-1">Checks for WCAG 2.1 AA compliance</p>
        </div>
      )}
    </div>
  );
}
