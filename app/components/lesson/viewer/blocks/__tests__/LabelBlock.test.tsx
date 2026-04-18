// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LabelBlock from '../LabelBlock';

describe('LabelBlock — heading (default)', () => {
  it('renders text inside an h3', () => {
    render(<LabelBlock text="Section One" />);
    expect(screen.getByRole('heading', { level: 3, name: 'Section One' })).toBeInTheDocument();
  });

  it('uses the left-border accent styling', () => {
    const { container } = render(<LabelBlock text="x" />);
    expect(container.firstChild).toHaveClass('border-l-2', 'border-slate-700');
  });
});

describe('LabelBlock — section', () => {
  it('renders text in a span with the section border styling', () => {
    const { container } = render(<LabelBlock style="section" text="Subsection" />);
    expect(screen.getByText('Subsection')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('border-slate-300');
  });
});

describe('LabelBlock — divider', () => {
  it('renders text between two gradient lines', () => {
    render(<LabelBlock style="divider" text="CHAPTER 2" />);
    expect(screen.getByText('CHAPTER 2')).toBeInTheDocument();
  });

  it('hides the text element entirely when text is empty', () => {
    const { container } = render(<LabelBlock style="divider" text="" />);
    // Divider gradients still render (2 lines) but no span
    expect(container.querySelector('span')).toBeNull();
  });
});

describe('LabelBlock — banner', () => {
  it('renders text on a dark banner background', () => {
    const { container } = render(<LabelBlock style="banner" text="Important" />);
    expect(screen.getByText('Important')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-slate-800');
  });
});

describe('LabelBlock — sizes', () => {
  it('applies different text size classes per size prop (heading)', () => {
    const { rerender, container } = render(<LabelBlock text="x" size="small" />);
    expect(container.querySelector('h3')).toHaveClass('text-base');

    rerender(<LabelBlock text="x" size="large" />);
    expect(container.querySelector('h3')).toHaveClass('text-xl');
  });

  it('falls back to medium for an unknown size', () => {
    const { container } = render(<LabelBlock text="x" size="extra-large" />);
    // Medium heading text size is text-lg
    expect(container.querySelector('h3')).toHaveClass('text-lg');
  });
});

describe('LabelBlock — defaults', () => {
  it('renders empty string when no text provided (no crash)', () => {
    const { container } = render(<LabelBlock />);
    // Heading should still be present, just empty
    expect(container.querySelector('h3')).toBeInTheDocument();
  });
});
