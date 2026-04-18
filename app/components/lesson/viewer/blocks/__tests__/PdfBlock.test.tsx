// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PdfBlock from '../PdfBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof PdfBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'My PDF',
    fileId: 'pdf-abc',
    url: undefined,
    fileName: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    onOpen: vi.fn(),
    ...overrides,
  };
}

describe('PdfBlock — body', () => {
  it('renders a "View PDF" link with target="_blank"', () => {
    render(<PdfBlock {...defaultProps()} />);
    const link = screen.getByRole('link', { name: /View PDF/ });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('uses the explicit url when provided', () => {
    render(<PdfBlock {...defaultProps({ url: 'https://cdn.example.com/doc.pdf' })} />);
    const link = screen.getByRole('link', { name: /View PDF/ });
    expect(link.getAttribute('href')).toBe('https://cdn.example.com/doc.pdf');
  });

  it('falls back to /api/files/:fileId when only fileId is provided', () => {
    render(<PdfBlock {...defaultProps({ fileId: 'abc123' })} />);
    expect(screen.getByRole('link', { name: /View PDF/ }).getAttribute('href')).toBe(
      '/api/files/abc123'
    );
  });

  it('shows the display file name or "PDF Document" fallback', () => {
    const { rerender } = render(<PdfBlock {...defaultProps({ fileName: 'chapter1.pdf' })} />);
    expect(screen.getByText('chapter1.pdf')).toBeInTheDocument();

    rerender(<PdfBlock {...defaultProps({ fileName: undefined })} />);
    expect(screen.getByText('PDF Document')).toBeInTheDocument();
  });

  it('shows the empty-state placeholder when no src is available', () => {
    render(<PdfBlock {...defaultProps({ url: undefined, fileId: undefined })} />);
    expect(screen.queryByRole('link', { name: /View PDF/ })).not.toBeInTheDocument();
    expect(screen.getByText(/PDF not uploaded yet/)).toBeInTheDocument();
  });
});

describe('PdfBlock — header and interaction', () => {
  it('omits the header when no title', () => {
    const { container } = render(<PdfBlock {...defaultProps({ title: undefined })} />);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('calls onOpen with the display filename when the link is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ fileName: 'chapter1.pdf' });
    render(<PdfBlock {...props} />);
    await user.click(screen.getByRole('link', { name: /View PDF/ }));
    expect(props.onOpen).toHaveBeenCalledWith('chapter1.pdf');
  });

  it('is safe to call when onOpen is not provided', async () => {
    const user = userEvent.setup();
    render(<PdfBlock {...defaultProps({ onOpen: undefined })} />);
    await expect(user.click(screen.getByRole('link', { name: /View PDF/ }))).resolves.not.toThrow();
  });
});
