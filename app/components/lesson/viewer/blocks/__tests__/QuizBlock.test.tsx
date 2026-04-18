// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizBlock from '../QuizBlock';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/components/quiz/QuizStatusButton', () => ({
  __esModule: true,
  default: (props: { quizId: string }) => (
    <div data-testid="quiz-status-button" data-quiz-id={props.quizId} />
  ),
}));

vi.mock('@/app/components/ui/LoadingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-indicator" />,
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof QuizBlock>> = {}) {
  return {
    index: 0,
    title: 'Midterm',
    quizId: 'quiz-1',
    quiz: {
      description: 'Covers chapters 1-3',
      points: 50,
      questions: [{}, {}, {}],
      time_limit: 30,
    },
    isLoading: false,
    isInstructor: false,
    deletingId: null,
    onDelete: vi.fn(),
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('QuizBlock — loading state', () => {
  it('shows the loading indicator while fetching', () => {
    render(<QuizBlock {...defaultProps({ isLoading: true, quiz: undefined })} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('shows a greyed "Loading..." button while quiz data is absent', () => {
    render(<QuizBlock {...defaultProps({ quiz: undefined })} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('quiz-status-button')).not.toBeInTheDocument();
  });
});

describe('QuizBlock — loaded state', () => {
  it('renders quiz details (points, question count, time limit)', () => {
    render(<QuizBlock {...defaultProps()} />);
    expect(screen.getByText('50 pts')).toBeInTheDocument();
    expect(screen.getByText('3 questions')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  });

  it('falls back to 100 pts / 0 questions when values are missing', () => {
    render(<QuizBlock {...defaultProps({ quiz: {} })} />);
    expect(screen.getByText('100 pts')).toBeInTheDocument();
    expect(screen.getByText('0 questions')).toBeInTheDocument();
  });

  it('renders the QuizStatusButton with the right quizId', () => {
    render(<QuizBlock {...defaultProps({ quizId: 'abc123' })} />);
    expect(screen.getByTestId('quiz-status-button').getAttribute('data-quiz-id')).toBe('abc123');
  });

  it('sanitizes description HTML', () => {
    const { container } = render(
      <QuizBlock
        {...defaultProps({ quiz: { description: '<script>x</script><p>Safe</p>' } })}
      />
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });
});

describe('QuizBlock — instructor actions', () => {
  it('hides Edit and Delete for students', () => {
    render(<QuizBlock {...defaultProps({ isInstructor: false })} />);
    expect(screen.queryByTitle('Edit Quiz')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete Quiz')).not.toBeInTheDocument();
  });

  it('shows Edit and Delete for instructors', () => {
    render(<QuizBlock {...defaultProps({ isInstructor: true })} />);
    expect(screen.getByTitle('Edit Quiz').getAttribute('href')).toBe('/quizzes/quiz-1/edit');
    expect(screen.getByTitle('Delete Quiz')).toBeInTheDocument();
  });

  it('calls onDelete(quizId) when Delete is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ isInstructor: true });
    render(<QuizBlock {...props} />);
    await user.click(screen.getByTitle('Delete Quiz'));
    expect(props.onDelete).toHaveBeenCalledWith('quiz-1');
  });

  it('shows busy state on Delete when deletingId matches', () => {
    render(
      <QuizBlock {...defaultProps({ isInstructor: true, deletingId: 'quiz-1' })} />
    );
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });
});

describe('QuizBlock — empty state', () => {
  it('renders the "Quiz not configured yet" placeholder when no quizId', () => {
    render(<QuizBlock {...defaultProps({ quizId: undefined, quiz: undefined })} />);
    expect(screen.getByText(/Quiz not configured yet/)).toBeInTheDocument();
  });
});
