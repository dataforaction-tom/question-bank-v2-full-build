import React, { createContext, useState, useEffect, useContext } from 'react';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);

  useEffect(() => {
    const storedOrg = localStorage.getItem('currentOrganization');
    if (storedOrg) {
      setCurrentOrganization(JSON.parse(storedOrg));
    }
  }, []);

  const updateCurrentOrganization = (org) => {
    setCurrentOrganization(org);
    if (org) {
      localStorage.setItem('currentOrganization', JSON.stringify(org));
    } else {
      localStorage.removeItem('currentOrganization');
    }
  };

  return (
    <OrganizationContext.Provider value={{ currentOrganization, updateCurrentOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
