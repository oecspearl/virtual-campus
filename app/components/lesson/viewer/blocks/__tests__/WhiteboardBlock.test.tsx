// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteboardBlock from '../WhiteboardBlock';

// WhiteboardViewer is imported dynamically inside the component. The dynamic
// import reads the module at render time — stub the module itself.
vi.mock('@/app/components/whiteboard/WhiteboardViewer', () => ({
  __esModule: true,
  default: (props: { whiteboardId?: string; title?: string; height?: string }) => (
    <div
      data-testid="whiteboard-viewer-stub"
      data-wbid={props.whiteboardId || ''}
      data-title={props.title || ''}
      data-height={props.height || ''}
    />
  ),
}));

function defaultProps(overrides: Partial<React.ComponentProps<typeof WhiteboardBlock>> = {}) {
  return {
    title: 'My Board',
    whiteboardId: 'wb-1',
    elements: undefined,
    appState: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('WhiteboardBlock — header', () => {
  it('renders the title in the header', () => {
    render(<WhiteboardBlock {...defaultProps({ title: 'Brainstorm' })} />);
    expect(screen.getByText('Brainstorm')).toBeInTheDocument();
  });

  it('omits the header when no title', () => {
    const { container } = render(<WhiteboardBlock {...defaultProps({ title: undefined })} />);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('calls onToggleCollapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<WhiteboardBlock {...props} />);
    await user.click(screen.getByText('My Board'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });

  it('does NOT render a bookmark button (differs from other blocks by design)', () => {
    render(<WhiteboardBlock {...defaultProps()} />);
    // Our extracted BookmarkButton would add a testid stub if used; there is none.
    expect(screen.queryByTestId('bookmark-stub')).not.toBeInTheDocument();
  });
});

describe('WhiteboardBlock — viewer integration', () => {
  it('renders the whiteboard viewer with correct props', async () => {
    render(<WhiteboardBlock {...defaultProps({ whiteboardId: 'wb-abc', title: 'Sketch' })} />);
    const stub = await waitFor(() => screen.getByTestId('whiteboard-viewer-stub'));
    expect(stub.getAttribute('data-wbid')).toBe('wb-abc');
    expect(stub.getAttribute('data-title')).toBe('Sketch');
    expect(stub.getAttribute('data-height')).toBe('450px');
  });
});
