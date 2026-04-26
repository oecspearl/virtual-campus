'use client';

import HelpPageShell from '@/app/help/_components/HelpPageShell';
import { instructorHelpSections, instructorGroupOrder } from './sections';

export default function InstructorHelpPage() {
  return (
    <HelpPageShell
      pageTitle="Instructor Help Center"
      helpHomeHref="/help/instructor"
      breadcrumbLabel="Instructor"
      userRole="instructor"
      currentPagePath="/help/instructor"
      defaultSectionId="getting-started"
      sections={instructorHelpSections}
      groupOrder={instructorGroupOrder}
      fallbackAiPrompt="How do I create a new course?"
    />
  );
}
