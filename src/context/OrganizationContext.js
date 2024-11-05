import React, { createContext, useState, useEffect, useContext } from 'react';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const storedOrg = localStorage.getItem('currentOrganization');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    if (storedOrg) {
      setCurrentOrganization(JSON.parse(storedOrg));
    }
    if (storedIsAdmin) {
      setIsAdmin(JSON.parse(storedIsAdmin));
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

  const updateIsAdmin = (adminStatus) => {
    setIsAdmin(adminStatus);
    localStorage.setItem('isAdmin', JSON.stringify(adminStatus));
  };

  return (
    <OrganizationContext.Provider value={{ currentOrganization, isAdmin, updateCurrentOrganization, updateIsAdmin }}>
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
