// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GradingInfoPanel from '../GradingInfoPanel';

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

describe('GradingInfoPanel', () => {
  it('starts collapsed and expands on click', async () => {
    const user = userEvent.setup();
    render(<GradingInfoPanel gradingCriteria="Participate clearly." />);
    expect(screen.queryByText('Participate clearly.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Grading Information/ }));
    expect(screen.getByText('Participate clearly.')).toBeInTheDocument();
  });

  it('reports the open state via aria-expanded', async () => {
    const user = userEvent.setup();
    render(<GradingInfoPanel gradingCriteria="x" />);
    const button = screen.getByRole('button', { name: /Grading Information/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('omits the rubric section when no rubric is provided', async () => {
    const user = userEvent.setup();
    render(<GradingInfoPanel gradingCriteria="x" />);
    await user.click(screen.getByRole('button', { name: /Grading Information/ }));
    expect(screen.queryByText('Scoring Rubric:')).not.toBeInTheDocument();
  });

  it('renders a rubric with explicit levels', async () => {
    const user = userEvent.setup();
    render(
      <GradingInfoPanel
        rubric={[
          {
            id: 'c-1',
            criteria: 'Clarity',
            levels: [
              { name: 'Excellent', description: 'crystal', points: 10 },
              { name: 'Good', description: 'solid', points: 7 },
            ],
          },
        ]}
        totalPoints={10}
      />
    );
    await user.click(screen.getByRole('button', { name: /Grading Information/ }));
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText('crystal')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Max: 10 pts')).toBeInTheDocument();
    expect(screen.getByText('10 pts')).toBeInTheDocument();
  });

  it('falls back to a single "Full Credit" level for legacy flat-shape criteria', async () => {
    const user = userEvent.setup();
    render(
      <GradingInfoPanel
        rubric={[
          { id: 'c-1', criterion: 'Effort', points: 5, description: 'Shows effort' },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: /Grading Information/ }));
    expect(screen.getByText('Effort')).toBeInTheDocument();
    expect(screen.getByText('Full Credit')).toBeInTheDocument();
    expect(screen.getByText('Shows effort')).toBeInTheDocument();
  });

  it('shows requirements when minReplies or minWords are set', async () => {
    const user = userEvent.setup();
    render(<GradingInfoPanel minReplies={3} minWords={200} />);
    await user.click(screen.getByRole('button', { name: /Grading Information/ }));
    expect(screen.getByText('Requirements:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('hides requirements section when both are zero/unset', async () => {
    const user = userEvent.setup();
    render(<GradingInfoPanel gradingCriteria="just text" />);
    await user.click(screen.getByRole('button', { name: /Grading Information/ }));
    expect(screen.queryByText('Requirements:')).not.toBeInTheDocument();
  });

  it('uses a custom label when provided', () => {
    render(<GradingInfoPanel label="View Assignment Rubric" />);
    expect(
      screen.getByRole('button', { name: /View Assignment Rubric/ })
    ).toBeInTheDocument();
  });
});
