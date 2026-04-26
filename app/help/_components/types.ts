import type React from 'react';

export interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  group: string;
  searchText: string;
  content: React.ReactNode;
}
