// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeaturedCourseSelector, {
  type FeaturedCourse,
} from '../FeaturedCourseSelector';

vi.mock('@iconify/react', () => ({
  Icon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} />,
}));

vi.mock('@/app/components/ui/LoadingIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-indicator" />,
  InlineLoader: () => <span data-testid="inline-loader" />,
}));

function sampleCourses(): FeaturedCourse[] {
  return [
    { id: 'c-alpha', title: 'Alpha Course', description: 'intro', thumbnail: null, published: true },
    { id: 'c-beta', title: 'Beta Course', description: 'deep', thumbnail: null, published: true },
    { id: 'c-gamma', title: 'Gamma Course', description: null, thumbnail: null, published: true },
  ];
}

describe('FeaturedCourseSelector', () => {
  it('shows a loading indicator when loading=true', () => {
    render(
      <FeaturedCourseSelector
        availableCourses={[]}
        selectedCourseIds={[]}
        onSelectionChange={vi.fn()}
        loading
      />
    );
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders every course row when not loading', () => {
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={[]}
        onSelectionChange={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText('Alpha Course')).toBeInTheDocument();
    expect(screen.getByText('Beta Course')).toBeInTheDocument();
    expect(screen.getByText('Gamma Course')).toBeInTheDocument();
  });

  it('filters by title via the search box', async () => {
    const user = userEvent.setup();
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={[]}
        onSelectionChange={vi.fn()}
        loading={false}
      />
    );
    await user.type(screen.getByPlaceholderText('Search courses...'), 'beta');
    expect(screen.getByText('Beta Course')).toBeInTheDocument();
    expect(screen.queryByText('Alpha Course')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Course')).not.toBeInTheDocument();
  });

  it('clicking a row toggles the course in/out of the selection', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={[]}
        onSelectionChange={onSelectionChange}
        loading={false}
      />
    );
    await user.click(screen.getByText('Alpha Course'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['c-alpha']);
  });

  it('clicking an already-selected row removes it from the selection', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={['c-alpha', 'c-beta']}
        onSelectionChange={onSelectionChange}
        loading={false}
      />
    );
    // "Alpha Course" appears in both the main row and the selection-chip
    // summary — click the main-list row via its <h4>, which is unique.
    const mainRowHeading = screen
      .getAllByText('Alpha Course')
      .find((el) => el.tagName === 'H4');
    expect(mainRowHeading).toBeDefined();
    await user.click(mainRowHeading!);
    expect(onSelectionChange).toHaveBeenLastCalledWith(['c-beta']);
  });

  it('Clear Selection resets to an empty array', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={['c-alpha']}
        onSelectionChange={onSelectionChange}
        loading={false}
      />
    );
    await user.click(screen.getByRole('button', { name: /Clear Selection/ }));
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('shows selected-course chips with their order number', () => {
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={['c-beta', 'c-alpha']}
        onSelectionChange={vi.fn()}
        loading={false}
      />
    );
    expect(screen.getByText('Selected Courses (in order):')).toBeInTheDocument();
    // Each order number appears in its chip
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows an empty state when no courses match the search', async () => {
    const user = userEvent.setup();
    render(
      <FeaturedCourseSelector
        availableCourses={sampleCourses()}
        selectedCourseIds={[]}
        onSelectionChange={vi.fn()}
        loading={false}
      />
    );
    await user.type(screen.getByPlaceholderText('Search courses...'), 'zzz-no-match');
    expect(screen.getByText(/No courses found/)).toBeInTheDocument();
  });
});
