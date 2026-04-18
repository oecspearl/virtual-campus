// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentProgressCheckbox from '../ContentProgressCheckbox';

describe('ContentProgressCheckbox', () => {
  it('shows "Mark as complete" label when incomplete', () => {
    render(<ContentProgressCheckbox isComplete={false} onToggle={() => {}} />);
    expect(
      screen.getByRole('button', { name: 'Mark as complete' })
    ).toBeInTheDocument();
  });

  it('shows "Mark as incomplete" label when complete', () => {
    render(<ContentProgressCheckbox isComplete={true} onToggle={() => {}} />);
    expect(
      screen.getByRole('button', { name: 'Mark as incomplete' })
    ).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ContentProgressCheckbox isComplete={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('stops click propagation so the parent collapse header does not toggle', async () => {
    const user = userEvent.setup();
    const parentOnClick = vi.fn();
    const onToggle = vi.fn();

    render(
      <div onClick={parentOnClick}>
        <ContentProgressCheckbox isComplete={false} onToggle={onToggle} />
      </div>
    );

    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(parentOnClick).not.toHaveBeenCalled();
  });
});
