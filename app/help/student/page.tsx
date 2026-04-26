'use client';

import HelpPageShell from '@/app/help/_components/HelpPageShell';
import { studentHelpSections, studentGroupOrder } from './sections';

export default function StudentHelpPage() {
  return (
    <HelpPageShell
      pageTitle="Student Help Center"
      helpHomeHref="/help/student"
      breadcrumbLabel="Student"
      userRole="student"
      currentPagePath="/help/student"
      defaultSectionId="getting-started"
      sections={studentHelpSections}
      groupOrder={studentGroupOrder}
      fallbackAiPrompt="How do I enrol in a course?"
    />
  );
}
