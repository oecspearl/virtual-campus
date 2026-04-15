import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Help Center',
  description: 'Get help with navigating courses, submitting assignments, and using learning tools.',
};

export default function StudentHelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
