// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrphanContentCard from '../OrphanContentCard';

describe('OrphanContentCard', () => {
  it('renders "Quiz Not Found" heading for kind="quiz"', () => {
    render(<OrphanContentCard kind="quiz" canRemove={false} onRemove={() => {}} />);
    expect(screen.getByText('Quiz Not Found')).toBeInTheDocument();
  });

  it('renders "Assignment Not Found" heading for kind="assignment"', () => {
    render(<OrphanContentCard kind="assignment" canRemove={false} onRemove={() => {}} />);
    expect(screen.getByText('Assignment Not Found')).toBeInTheDocument();
  });

  it('uses the correct noun in the body text', () => {
    const { rerender } = render(
      <OrphanContentCard kind="quiz" canRemove={false} onRemove={() => {}} />
    );
    expect(screen.getByText(/This quiz has been deleted/)).toBeInTheDocument();

    rerender(<OrphanContentCard kind="assignment" canRemove={false} onRemove={() => {}} />);
    expect(screen.getByText(/This assignment has been deleted/)).toBeInTheDocument();
  });

  it('hides the remove button for students (canRemove=false)', () => {
    render(<OrphanContentCard kind="quiz" canRemove={false} onRemove={() => {}} />);
    expect(screen.queryByRole('button', { name: /Remove from Lesson/ })).not.toBeInTheDocument();
  });

  it('shows the remove button for instructors (canRemove=true)', () => {
    render(<OrphanContentCard kind="quiz" canRemove={true} onRemove={() => {}} />);
    expect(screen.getByRole('button', { name: /Remove from Lesson/ })).toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<OrphanContentCard kind="quiz" canRemove={true} onRemove={onRemove} />);
    await user.click(screen.getByRole('button', { name: /Remove from Lesson/ }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
