// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FullscreenContentOverlay from '../FullscreenContentOverlay';

describe('FullscreenContentOverlay', () => {
  it('displays the given title in the header', () => {
    render(
      <FullscreenContentOverlay title="Chapter 3: Cells" html="<p>Hi</p>" onClose={() => {}} />
    );
    expect(screen.getByRole('heading', { name: 'Chapter 3: Cells' })).toBeInTheDocument();
  });

  it('renders sanitized HTML content', () => {
    const { container } = render(
      <FullscreenContentOverlay
        title="x"
        html="<p>Hello <strong>world</strong></p>"
        onClose={() => {}}
      />
    );
    expect(container.querySelector('strong')?.textContent).toBe('world');
  });

  it('strips script tags from the HTML content (sanitization)', () => {
    const { container } = render(
      <FullscreenContentOverlay
        title="x"
        html="<p>Safe</p><script>alert('xss')</script>"
        onClose={() => {}}
      />
    );
    expect(container.querySelector('script')).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<FullscreenContentOverlay title="x" html="<p>Hi</p>" onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /Close fullscreen/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
