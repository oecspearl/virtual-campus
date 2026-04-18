// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CodeSandboxBlock from '../CodeSandboxBlock';

vi.mock('@/app/components/student', () => ({
  BookmarkButton: () => <div data-testid="bookmark-stub" />,
}));

vi.mock('@/app/components/media/CodeSandbox', () => ({
  __esModule: true,
  default: (props: {
    title: string;
    language: string;
    initialCode?: string;
    template?: string;
    readOnly?: boolean;
  }) => (
    <div
      data-testid="code-sandbox-stub"
      data-title={props.title}
      data-language={props.language}
      data-initial={props.initialCode || ''}
      data-template={props.template || ''}
      data-readonly={String(!!props.readOnly)}
    />
  ),
}));

function defaultProps(
  overrides: Partial<React.ComponentProps<typeof CodeSandboxBlock>> = {}
) {
  return {
    index: 0,
    lessonId: 'lesson-1',
    title: 'Write a function',
    sandboxTitle: undefined,
    language: undefined,
    initialCode: undefined,
    template: undefined,
    instructions: undefined,
    readOnly: undefined,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
    isComplete: false,
    onToggleComplete: vi.fn(),
    ...overrides,
  };
}

describe('CodeSandboxBlock — header', () => {
  it('renders the title in the header', () => {
    render(<CodeSandboxBlock {...defaultProps({ title: 'Exercise 3' })} />);
    expect(screen.getByText('Exercise 3')).toBeInTheDocument();
  });

  it('omits the header when title is absent', () => {
    const { container } = render(<CodeSandboxBlock {...defaultProps({ title: undefined })} />);
    expect(container.querySelector('h3')).toBeNull();
  });

  it('toggles collapse when the header is clicked', async () => {
    const user = userEvent.setup();
    const props = defaultProps();
    render(<CodeSandboxBlock {...props} />);
    await user.click(screen.getByText('Write a function'));
    expect(props.onToggleCollapse).toHaveBeenCalled();
  });
});

describe('CodeSandboxBlock — sandbox props', () => {
  it('defaults the language to "javascript" when none provided', async () => {
    render(<CodeSandboxBlock {...defaultProps({ language: undefined })} />);
    const stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-language')).toBe('javascript');
  });

  it('forwards a custom language', async () => {
    render(<CodeSandboxBlock {...defaultProps({ language: 'python' })} />);
    const stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-language')).toBe('python');
  });

  it('forwards initialCode and template', async () => {
    render(
      <CodeSandboxBlock
        {...defaultProps({ initialCode: 'print("hi")', template: 'python-starter' })}
      />
    );
    const stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-initial')).toBe('print("hi")');
    expect(stub.getAttribute('data-template')).toBe('python-starter');
  });

  it('defaults readOnly to false', async () => {
    render(<CodeSandboxBlock {...defaultProps({ readOnly: undefined })} />);
    const stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-readonly')).toBe('false');
  });

  it('forwards readOnly=true', async () => {
    render(<CodeSandboxBlock {...defaultProps({ readOnly: true })} />);
    const stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-readonly')).toBe('true');
  });

  it('uses sandboxTitle when provided, else falls back to title, else "Code Sandbox"', async () => {
    const { rerender } = render(
      <CodeSandboxBlock {...defaultProps({ sandboxTitle: 'Inner', title: 'Outer' })} />
    );
    let stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-title')).toBe('Inner');

    rerender(<CodeSandboxBlock {...defaultProps({ sandboxTitle: undefined, title: 'Outer' })} />);
    stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-title')).toBe('Outer');

    rerender(
      <CodeSandboxBlock {...defaultProps({ sandboxTitle: undefined, title: undefined })} />
    );
    stub = await waitFor(() => screen.getByTestId('code-sandbox-stub'));
    expect(stub.getAttribute('data-title')).toBe('Code Sandbox');
  });
});
