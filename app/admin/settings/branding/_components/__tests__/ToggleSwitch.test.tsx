// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToggleSwitch from '../ToggleSwitch';

describe('ToggleSwitch', () => {
  it('renders the label and description', () => {
    render(
      <ToggleSwitch
        label="Hero section"
        description="Show the homepage hero"
        enabled={false}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Hero section')).toBeInTheDocument();
    expect(screen.getByText('Show the homepage hero')).toBeInTheDocument();
  });

  it('reflects the enabled state via aria-checked', () => {
    const { rerender } = render(
      <ToggleSwitch label="X" description="y" enabled={false} onChange={vi.fn()} />
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    rerender(<ToggleSwitch label="X" description="y" enabled onChange={vi.fn()} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with the flipped value when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleSwitch label="X" description="y" enabled={false} onChange={onChange} />
    );
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('flips from on to off', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ToggleSwitch label="X" description="y" enabled onChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
