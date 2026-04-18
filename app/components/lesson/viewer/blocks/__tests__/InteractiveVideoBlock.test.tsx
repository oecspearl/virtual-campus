// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InteractiveVideoBlock, { normalizeCheckpoints } from '../InteractiveVideoBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

vi.mock('@/app/components/media/InteractiveVideoPlayer', () => ({
  __esModule: true,
  default: (props: {
    src: string;
    title: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checkpoints: any[];
  }) => (
    <div
      data-testid="ivp-stub"
      data-src={props.src}
      data-title={props.title}
      data-checkpoints={JSON.stringify(props.checkpoints)}
    />
  ),
}));

function defaultProps(
  overrides: Partial<React.ComponentProps<typeof InteractiveVideoBlock>> = {}
) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'Concept Check',
    url: 'https://example.com/vid.mp4',
    videoUrl: undefined,
    fileId: undefined,
    videoTitle: undefined,
    checkpoints: [],
    description: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

// ─── normalizeCheckpoints ─────────────────────────────────────────────────

describe('normalizeCheckpoints', () => {
  it('copies already-camelCase fields through untouched', () => {
    const result = normalizeCheckpoints([
      {
        id: 'cp1',
        timestamp: 30,
        questionText: 'Why?',
        questionType: 'multiple_choice',
        options: ['A', 'B'],
        correctAnswer: 'A',
        feedback: 'Because',
        points: 2,
      },
    ]);
    expect(result[0]).toMatchObject({
      id: 'cp1',
      timestamp: 30,
      questionText: 'Why?',
      questionType: 'multiple_choice',
      options: ['A', 'B'],
      correctAnswer: 'A',
      feedback: 'Because',
      points: 2,
    });
  });

  it('normalizes snake_case keys to camelCase', () => {
    const result = normalizeCheckpoints([
      {
        timestamp: 45,
        question_text: 'Explain',
        question_type: 'short_answer',
        correct_answer: 'Answer',
      },
    ]);
    expect(result[0]).toMatchObject({
      questionText: 'Explain',
      questionType: 'short_answer',
      correctAnswer: 'Answer',
    });
  });

  it('fills sensible defaults for missing fields', () => {
    const result = normalizeCheckpoints([{ timestamp: 15 }]);
    expect(result[0]).toMatchObject({
      timestamp: 15,
      questionText: '',
      questionType: 'multiple_choice',
      options: [],
      feedback: '',
      points: 1,
    });
    expect(result[0].id).toBe('15'); // falls back to timestamp.toString
  });

  it('returns [] for empty / missing input', () => {
    expect(normalizeCheckpoints()).toEqual([]);
    expect(normalizeCheckpoints([])).toEqual([]);
  });
});

// ─── Source resolution ─────────────────────────────────────────────────────

describe('InteractiveVideoBlock — source resolution', () => {
  it('prefers the explicit url', async () => {
    render(<InteractiveVideoBlock {...defaultProps({ url: 'https://a/' })} />);
    const stub = await waitFor(() => screen.getByTestId('ivp-stub'));
    expect(stub.getAttribute('data-src')).toBe('https://a/');
  });

  it('falls back to videoUrl when url is absent', async () => {
    render(<InteractiveVideoBlock {...defaultProps({ url: undefined, videoUrl: 'https://b/' })} />);
    const stub = await waitFor(() => screen.getByTestId('ivp-stub'));
    expect(stub.getAttribute('data-src')).toBe('https://b/');
  });

  it('falls back to /api/files/:fileId when only fileId is provided', async () => {
    render(
      <InteractiveVideoBlock
        {...defaultProps({ url: undefined, videoUrl: undefined, fileId: 'f1' })}
      />
    );
    const stub = await waitFor(() => screen.getByTestId('ivp-stub'));
    expect(stub.getAttribute('data-src')).toBe('/api/files/f1');
  });

  it('shows the empty-state placeholder when no source exists', () => {
    render(
      <InteractiveVideoBlock
        {...defaultProps({ url: undefined, videoUrl: undefined, fileId: undefined })}
      />
    );
    expect(screen.getByText(/Interactive video not configured yet/)).toBeInTheDocument();
    expect(screen.queryByTestId('ivp-stub')).not.toBeInTheDocument();
  });
});

// ─── Header and checkpoints ────────────────────────────────────────────────

describe('InteractiveVideoBlock — header', () => {
  it('shows a "N checkpoints" badge when there are any', () => {
    render(
      <InteractiveVideoBlock
        {...defaultProps({
          checkpoints: [
            { timestamp: 10, questionText: 'q1' },
            { timestamp: 20, questionText: 'q2' },
          ],
        })}
      />
    );
    expect(screen.getByText(/2 checkpoints/)).toBeInTheDocument();
  });

  it('hides the badge when there are no checkpoints', () => {
    render(<InteractiveVideoBlock {...defaultProps({ checkpoints: [] })} />);
    expect(screen.queryByText(/checkpoint/)).not.toBeInTheDocument();
  });

  it('toggles collapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<InteractiveVideoBlock {...props} />);
    await user.click(screen.getByText('Concept Check'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });
});

// ─── Description notes ────────────────────────────────────────────────────

describe('InteractiveVideoBlock — notes', () => {
  it('renders sanitized description when provided', () => {
    const { container } = render(
      <InteractiveVideoBlock
        {...defaultProps({ description: '<script>alert(1)</script><p>hi</p>' })}
      />
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('omits the notes panel when description is absent', () => {
    render(<InteractiveVideoBlock {...defaultProps({ description: undefined })} />);
    expect(screen.queryByText(/Notes/)).not.toBeInTheDocument();
  });
});
