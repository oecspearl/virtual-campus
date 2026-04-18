// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayOverlay from '../PlayOverlay';

describe('PlayOverlay', () => {
  it('renders a single accessible Play button', () => {
    render(<PlayOverlay onPlay={() => {}} />);
    expect(screen.getByRole('button', { name: /Play video/ })).toBeInTheDocument();
  });

  it('calls onPlay when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const onPlay = vi.fn();
    render(<PlayOverlay onPlay={onPlay} />);

    await user.click(screen.getByRole('button', { name: /Play video/ }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('covers the full video surface (absolute inset-0)', () => {
    const { container } = render(<PlayOverlay onPlay={() => {}} />);
    const button = container.querySelector('button')!;
    expect(button.className).toMatch(/absolute/);
    expect(button.className).toMatch(/inset-0/);
  });
});
