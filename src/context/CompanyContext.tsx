'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Company = 'SST' | 'Shinwa Anzen';

interface CompanyContextType {
  company: Company;
  setCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = useState<Company>('SST');

  // Load from local storage if available
  useEffect(() => {
    const saved = localStorage.getItem('selectedCompany');
    if (saved === 'SST' || saved === 'Shinwa Anzen') {
      setCompany(saved);
    }
  }, []);

  const handleSetCompany = (newCompany: Company) => {
    setCompany(newCompany);
    localStorage.setItem('selectedCompany', newCompany);
    // Add logic here to apply theme colors to the document
    if (newCompany === 'SST') {
      document.documentElement.style.setProperty('--primary-color', '#0033a0'); // Blue
      document.documentElement.style.setProperty('--secondary-color', '#ffffff'); // White
      document.documentElement.style.setProperty('--text-color', '#333333');
    } else {
      document.documentElement.style.setProperty('--primary-color', '#0033a0'); // Blue
      document.documentElement.style.setProperty('--secondary-color', '#d4af37'); // Gold
      document.documentElement.style.setProperty('--text-color', '#ffffff');
    }
    // Set a data attribute on body for specific css overrides if needed
    document.body.setAttribute('data-company', newCompany);
  };

  return (
    <CompanyContext.Provider value={{ company, setCompany: handleSetCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
