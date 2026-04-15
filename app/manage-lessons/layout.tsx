import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manage Lessons',
  description: 'Create, edit, and organize lessons for your courses.',
};

export default function ManageLessonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
