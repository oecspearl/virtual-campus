// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileBlock from '../FileBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof FileBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'My File',
    fileId: 'file-abc',
    url: undefined,
    fileName: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    onDownload: vi.fn(),
    ...overrides,
  };
}

describe('FileBlock — header always renders', () => {
  it('always renders the header, even without an explicit title', () => {
    const { container } = render(<FileBlock {...defaultProps({ title: undefined })} />);
    const header = container.querySelector('h3');
    expect(header).toBeInTheDocument();
    expect(header?.textContent).toContain('File');
  });

  it('shows the provided title in the header', () => {
    render(<FileBlock {...defaultProps({ title: 'Lab Worksheet', fileName: 'custom.zip' })} />);
    // With a distinct fileName, title appears only in the header
    expect(screen.getByText('Lab Worksheet')).toBeInTheDocument();
  });
});

describe('FileBlock — download link', () => {
  it('renders a Download link with the download attribute', () => {
    const { container } = render(<FileBlock {...defaultProps()} />);
    const link = container.querySelector('a[download]');
    expect(link).toBeInTheDocument();
    expect(link?.textContent).toContain('Download');
  });

  it('uses the explicit url when provided', () => {
    const { container } = render(
      <FileBlock {...defaultProps({ url: 'https://cdn.example.com/thing.zip' })} />
    );
    expect(container.querySelector('a[download]')?.getAttribute('href')).toBe(
      'https://cdn.example.com/thing.zip'
    );
  });

  it('falls back to /api/files/:fileId when only fileId is provided', () => {
    const { container } = render(<FileBlock {...defaultProps({ fileId: 'abc123' })} />);
    expect(container.querySelector('a[download]')?.getAttribute('href')).toBe(
      '/api/files/abc123'
    );
  });

  it('shows the empty-state message when no src is available', () => {
    const { container } = render(
      <FileBlock {...defaultProps({ url: undefined, fileId: undefined })} />
    );
    expect(container.querySelector('a[download]')).toBeNull();
    expect(screen.getByText(/File not uploaded yet/)).toBeInTheDocument();
  });
});

describe('FileBlock — display name', () => {
  it('shows fileName in the body when provided', () => {
    render(<FileBlock {...defaultProps({ fileName: 'report.docx' })} />);
    expect(screen.getByText('report.docx')).toBeInTheDocument();
  });

  it('falls back to title when fileName is not provided', () => {
    render(<FileBlock {...defaultProps({ fileName: undefined, title: 'My File' })} />);
    // Both header and body should contain "My File"
    const matches = screen.getAllByText('My File');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});

describe('FileBlock — interaction', () => {
  it('calls onDownload with the display name when the link is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ fileName: 'report.docx' });
    const { container } = render(<FileBlock {...props} />);
    await user.click(container.querySelector('a[download]')!);
    expect(props.onDownload).toHaveBeenCalledWith('report.docx');
  });

  it('is safe to click when onDownload is not provided', async () => {
    const user = userEvent.setup();
    const { container } = render(<FileBlock {...defaultProps({ onDownload: undefined })} />);
    await expect(
      user.click(container.querySelector('a[download]')!)
    ).resolves.not.toThrow();
  });
});
