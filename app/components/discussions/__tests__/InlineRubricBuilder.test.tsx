// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InlineRubricBuilder, { type RubricCriterion } from '../InlineRubricBuilder';

// The Icon component from @iconify/react renders to a shell without a symbol;
// swap it for a plain span so we can interact with surrounding buttons cleanly.
vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

function sampleCriterion(): RubricCriterion {
  return {
    id: 'crit-1',
    criteria: 'Clarity',
    levels: [
      { name: 'Excellent', description: 'clear', points: 25 },
      { name: 'Good', description: 'mostly clear', points: 20 },
    ],
  };
}

describe('InlineRubricBuilder', () => {
  it('renders each criterion and its levels', () => {
    const onChange = vi.fn();
    render(<InlineRubricBuilder value={[sampleCriterion()]} onChange={onChange} />);
    expect(screen.getByDisplayValue('Clarity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Excellent')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Good')).toBeInTheDocument();
  });

  it('addCriteria appends a new row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineRubricBuilder value={[]} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Add Criteria/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const nextValue = onChange.mock.calls[0][0] as RubricCriterion[];
    expect(nextValue).toHaveLength(1);
    expect(nextValue[0].criteria).toBe('New Criteria');
    expect(nextValue[0].levels).toHaveLength(4);
  });

  it('updating the criteria name fires onChange with the renamed row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineRubricBuilder value={[sampleCriterion()]} onChange={onChange} />);
    const nameInput = screen.getByDisplayValue('Clarity');
    // userEvent.type fires once per char — only the final call reflects the
    // full new value when the parent re-renders with it; assert the *latest*.
    await user.clear(nameInput);
    await user.type(nameInput, 'X');
    // Last call should have criteria starting with the first typed char;
    // since this is controlled and we don't re-feed value, assert *any* call
    // passed through criteria updates to the right id.
    expect(onChange).toHaveBeenCalled();
    const updatedCalls = onChange.mock.calls.filter(([rows]) =>
      (rows as RubricCriterion[]).some((r) => r.id === 'crit-1' && r.criteria !== 'Clarity')
    );
    expect(updatedCalls.length).toBeGreaterThan(0);
  });

  it('removing a level drops it from the criterion', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const crit: RubricCriterion = {
      ...sampleCriterion(),
      levels: [
        { name: 'A', description: '', points: 10 },
        { name: 'B', description: '', points: 5 },
        { name: 'C', description: '', points: 1 },
      ],
    };
    render(<InlineRubricBuilder value={[crit]} onChange={onChange} />);
    // The close icons sit in enabled <button>s — click the first one.
    const closeButtons = screen.getAllByTestId('icon-material-symbols:close');
    await user.click(closeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'crit-1',
        levels: expect.arrayContaining([
          expect.objectContaining({ name: 'B' }),
          expect.objectContaining({ name: 'C' }),
        ]),
      }),
    ]);
  });
});
