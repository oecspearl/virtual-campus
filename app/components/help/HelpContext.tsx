'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import HelpSystem from './HelpSystem';

interface HelpContextType {
  isHelpOpen: boolean;
  openHelp: (sectionId?: string) => void;
  closeHelp: () => void;
  userRole: string;
  setUserRole: (role: string) => void;
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

interface HelpProviderProps {
  children: ReactNode;
  initialUserRole?: string;
}

export function HelpProvider({ children, initialUserRole = 'student' }: HelpProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [userRole, setUserRole] = useState(initialUserRole);

  const openHelp = (sectionId?: string) => {
    setIsHelpOpen(true);
    // If a specific section is requested, we could store it in state
    // and pass it to the HelpSystem component
  };

  const closeHelp = () => {
    setIsHelpOpen(false);
  };

  return (
    <HelpContext.Provider value={{
      isHelpOpen,
      openHelp,
      closeHelp,
      userRole,
      setUserRole
    }}>
      {children}
      <HelpSystem 
        isOpen={isHelpOpen} 
        onClose={closeHelp}
        userRole={userRole}
      />
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}
