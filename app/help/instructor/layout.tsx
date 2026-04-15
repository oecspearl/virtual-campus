import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instructor Help Center',
  description: 'Get help with creating courses, managing students, and grading assignments.',
};

export default function InstructorHelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
