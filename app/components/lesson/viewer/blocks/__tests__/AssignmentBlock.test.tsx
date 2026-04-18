// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentBlock from '../AssignmentBlock';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/components/ui/LoadingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-indicator" />,
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof AssignmentBlock>> = {}) {
  return {
    index: 0,
    title: 'Essay 1',
    assignmentId: 'asg-1',
    assignment: {
      description: 'Write 500 words',
      points: 80,
      due_date: '2026-05-01',
      submission_types: ['file', 'link'],
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

describe('AssignmentBlock — header', () => {
  it('shows the title in the header', () => {
    render(<AssignmentBlock {...defaultProps()} />);
    expect(screen.getByText('Essay 1')).toBeInTheDocument();
  });

  it('falls back to "Assignment" when no title', () => {
    render(<AssignmentBlock {...defaultProps({ title: undefined })} />);
    const headers = screen.getAllByText('Assignment');
    expect(headers.length).toBeGreaterThan(0);
  });
});

describe('AssignmentBlock — loading state', () => {
  it('shows the loading indicator while fetching', () => {
    render(<AssignmentBlock {...defaultProps({ isLoading: true, assignment: undefined })} />);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });
});

describe('AssignmentBlock — loaded state', () => {
  it('renders assignment details including due date and submission types', () => {
    render(<AssignmentBlock {...defaultProps()} />);
    expect(screen.getByText('80 pts')).toBeInTheDocument();
    expect(screen.getByText(/Due: /)).toBeInTheDocument();
    expect(screen.getByText(/file, link submission/)).toBeInTheDocument();
  });

  it('omits due date when not set', () => {
    render(
      <AssignmentBlock
        {...defaultProps({
          assignment: { description: 'x', points: 50, submission_types: ['file'] },
        })}
      />
    );
    expect(screen.queryByText(/Due: /)).not.toBeInTheDocument();
  });

  it('defaults submission type label to "File submission" when array missing', () => {
    render(
      <AssignmentBlock
        {...defaultProps({ assignment: { description: 'x', points: 50 } })}
      />
    );
    expect(screen.getByText(/File submission/)).toBeInTheDocument();
  });

  it('sanitizes description HTML', () => {
    const { container } = render(
      <AssignmentBlock
        {...defaultProps({
          assignment: { description: '<script>x</script><p>Hi</p>', points: 50 },
        })}
      />
    );
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  it('renders the "View Assignment" link', () => {
    render(<AssignmentBlock {...defaultProps({ assignmentId: 'xyz' })} />);
    const view = screen.getByRole('link', { name: /View Assignment/ });
    expect(view.getAttribute('href')).toBe('/assignment/xyz');
  });
});

describe('AssignmentBlock — instructor actions', () => {
  it('hides Edit and Delete for students', () => {
    render(<AssignmentBlock {...defaultProps({ isInstructor: false })} />);
    expect(screen.queryByTitle('Edit Assignment')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete Assignment')).not.toBeInTheDocument();
  });

  it('shows Edit and Delete for instructors with correct href', () => {
    render(<AssignmentBlock {...defaultProps({ isInstructor: true })} />);
    expect(screen.getByTitle('Edit Assignment').getAttribute('href')).toBe(
      '/assignments/asg-1/edit'
    );
    expect(screen.getByTitle('Delete Assignment')).toBeInTheDocument();
  });

  it('calls onDelete(assignmentId) when Delete is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps({ isInstructor: true });
    render(<AssignmentBlock {...props} />);
    await user.click(screen.getByTitle('Delete Assignment'));
    expect(props.onDelete).toHaveBeenCalledWith('asg-1');
  });

  it('shows busy state on Delete when deletingId matches', () => {
    render(<AssignmentBlock {...defaultProps({ isInstructor: true, deletingId: 'asg-1' })} />);
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
  });
});

describe('AssignmentBlock — empty state', () => {
  it('renders the "Assignment not configured yet" placeholder when no assignmentId', () => {
    render(<AssignmentBlock {...defaultProps({ assignmentId: undefined, assignment: undefined })} />);
    expect(screen.getByText(/Assignment not configured yet/)).toBeInTheDocument();
  });
});
