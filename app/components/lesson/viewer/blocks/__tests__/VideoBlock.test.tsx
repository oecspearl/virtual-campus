// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoBlock from '../VideoBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

// VideoPlayer is dynamically imported — stub the module. Props we care
// about are reflected back via data- attributes for assertions.
vi.mock('@/app/components/media/VideoPlayer', () => ({
  __esModule: true,
  default: (props: {
    src: string;
    title: string;
    lessonId: string;
    contentIndex: number;
    preventSkipping?: boolean;
  }) => (
    <div
      data-testid="video-player-stub"
      data-src={props.src}
      data-title={props.title}
      data-lesson={props.lessonId}
      data-index={String(props.contentIndex)}
      data-prevent={String(!!props.preventSkipping)}
    />
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof VideoBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    title: 'Intro',
    src: 'https://example.com/video.mp4',
    videoTitle: undefined,
    chapters: undefined,
    captions: undefined,
    audioDescriptionSrc: undefined,
    preventSkipping: false,
    description: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    onFirstVisible: vi.fn(),
    onWatchProgress: vi.fn(),
    onDurationDetected: vi.fn(),
    ...overrides,
  };
}

describe('VideoBlock — header', () => {
  it('shows the title in the header', () => {
    render(<VideoBlock {...defaultProps({ title: 'Cell Division' })} />);
    expect(screen.getByText('Cell Division')).toBeInTheDocument();
  });

  it('omits the header when no title', () => {
    const { container } = render(<VideoBlock {...defaultProps({ title: undefined })} />);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('toggles collapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<VideoBlock {...props} />);
    await user.click(screen.getByText('Intro'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });
});

describe('VideoBlock — player props', () => {
  it('forwards src, lessonId, contentIndex, and preventSkipping', async () => {
    render(
      <VideoBlock
        {...defaultProps({
          src: 'https://example.com/x.mp4',
          lessonId: 'l-42',
          index: 3,
          preventSkipping: true,
        })}
      />
    );
    const stub = await waitFor(() => screen.getByTestId('video-player-stub'));
    expect(stub.getAttribute('data-src')).toBe('https://example.com/x.mp4');
    expect(stub.getAttribute('data-lesson')).toBe('l-42');
    expect(stub.getAttribute('data-index')).toBe('3');
    expect(stub.getAttribute('data-prevent')).toBe('true');
  });

  it('falls back to "Video Content" when no videoTitle provided', async () => {
    render(<VideoBlock {...defaultProps({ videoTitle: undefined })} />);
    const stub = await waitFor(() => screen.getByTestId('video-player-stub'));
    expect(stub.getAttribute('data-title')).toBe('Video Content');
  });

  it('uses videoTitle when provided', async () => {
    render(<VideoBlock {...defaultProps({ videoTitle: 'Chapter 2 Intro' })} />);
    const stub = await waitFor(() => screen.getByTestId('video-player-stub'));
    expect(stub.getAttribute('data-title')).toBe('Chapter 2 Intro');
  });
});

describe('VideoBlock — description / notes', () => {
  it('does not render the Notes panel when description is empty', () => {
    render(<VideoBlock {...defaultProps({ description: undefined })} />);
    expect(screen.queryByText(/Notes/i)).not.toBeInTheDocument();
  });

  it('renders sanitized HTML notes when description provided', () => {
    render(
      <VideoBlock
        {...defaultProps({
          description: '<p>Key point</p><script>alert(1)</script>',
        })}
      />
    );
    expect(screen.getByText('Key point')).toBeInTheDocument();
    const { container } = render(
      <VideoBlock
        {...defaultProps({ description: '<script>alert(1)</script><p>ok</p>' })}
      />
    );
    expect(container.querySelector('script')).toBeNull();
  });
});

describe('VideoBlock — onFirstVisible', () => {
  it('fires once when the block starts expanded', async () => {
    const onFirstVisible = vi.fn();
    render(<VideoBlock {...defaultProps({ isCollapsed: false, onFirstVisible })} />);
    await waitFor(() => expect(onFirstVisible).toHaveBeenCalledTimes(1));
  });

  it('does NOT fire when the block starts collapsed', async () => {
    const onFirstVisible = vi.fn();
    render(<VideoBlock {...defaultProps({ isCollapsed: true, onFirstVisible })} />);
    // Wait long enough to be confident it won't fire
    await new Promise((r) => setTimeout(r, 20));
    expect(onFirstVisible).not.toHaveBeenCalled();
  });

  it('fires only the first time the block becomes visible', async () => {
    const onFirstVisible = vi.fn();
    const { rerender } = render(
      <VideoBlock {...defaultProps({ isCollapsed: true, onFirstVisible })} />
    );
    await act(async () => {
      rerender(<VideoBlock {...defaultProps({ isCollapsed: false, onFirstVisible })} />);
    });
    await waitFor(() => expect(onFirstVisible).toHaveBeenCalledTimes(1));

    // Collapse and re-expand — should NOT fire again
    await act(async () => {
      rerender(<VideoBlock {...defaultProps({ isCollapsed: true, onFirstVisible })} />);
    });
    await act(async () => {
      rerender(<VideoBlock {...defaultProps({ isCollapsed: false, onFirstVisible })} />);
    });
    expect(onFirstVisible).toHaveBeenCalledTimes(1);
  });
});
