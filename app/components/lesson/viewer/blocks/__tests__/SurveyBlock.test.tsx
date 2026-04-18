// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SurveyBlock from '../SurveyBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

// next/link — stub as a plain anchor so we can assert on href.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...rest}>
      {children}
    </a>
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof SurveyBlock>> = {}) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'Feedback',
    surveyId: 'survey-1',
    description: undefined,
    isInstructor: false,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('SurveyBlock — header', () => {
  it('shows the title in the header', () => {
    render(<SurveyBlock {...defaultProps({ title: 'Course Feedback' })} />);
    expect(screen.getByText('Course Feedback')).toBeInTheDocument();
  });

  it('falls back to "Survey" when no title', () => {
    render(<SurveyBlock {...defaultProps({ title: undefined })} />);
    // "Survey" appears both in the kind-label tag and as the fallback title
    expect(screen.getAllByText('Survey').length).toBeGreaterThanOrEqual(2);
  });

  it('toggles collapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<SurveyBlock {...props} />);
    await user.click(screen.getByText('Feedback'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });
});

describe('SurveyBlock — body for students', () => {
  it('renders the "Take Survey" link pointing to /surveys/:id/take', () => {
    render(<SurveyBlock {...defaultProps()} />);
    const link = screen.getByRole('link', { name: /Take Survey/ });
    expect(link.getAttribute('href')).toBe('/surveys/survey-1/take');
  });

  it('does NOT show View Results / Edit Survey for students', () => {
    render(<SurveyBlock {...defaultProps({ isInstructor: false })} />);
    expect(screen.queryByRole('link', { name: /View Results/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Edit Survey/ })).not.toBeInTheDocument();
  });

  it('uses the default description when none provided', () => {
    render(<SurveyBlock {...defaultProps({ description: undefined })} />);
    expect(screen.getByText(/Please complete this survey/)).toBeInTheDocument();
  });

  it('uses a custom description when provided', () => {
    render(<SurveyBlock {...defaultProps({ description: 'Tell us what you thought.' })} />);
    expect(screen.getByText('Tell us what you thought.')).toBeInTheDocument();
  });
});

describe('SurveyBlock — body for instructors', () => {
  it('shows View Results and Edit Survey links', () => {
    render(<SurveyBlock {...defaultProps({ isInstructor: true })} />);
    expect(
      screen.getByRole('link', { name: /View Results/ }).getAttribute('href')
    ).toBe('/surveys/survey-1/results');
    expect(screen.getByRole('link', { name: /Edit Survey/ }).getAttribute('href')).toBe(
      '/surveys/survey-1/edit'
    );
  });
});

describe('SurveyBlock — empty state', () => {
  it('renders the "Survey not configured" placeholder when surveyId is missing', () => {
    render(<SurveyBlock {...defaultProps({ surveyId: undefined })} />);
    expect(screen.getByText(/Survey not configured/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Take Survey/ })).not.toBeInTheDocument();
  });
});
