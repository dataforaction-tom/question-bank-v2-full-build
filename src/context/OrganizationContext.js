import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    const validateAndSetOrganization = async () => {
      const storedOrg = localStorage.getItem('currentOrganization');
      if (!storedOrg || !session?.user?.id) return;

      const parsedOrg = JSON.parse(storedOrg);

      const { data, error } = await supabase
        .from('organization_users')
        .select('organization_id, role')
        .eq('user_id', session.user.id)
        .eq('organization_id', parsedOrg.id)
        .single();

      if (error || !data) {
        console.log('User no longer has access to stored organization');
        setCurrentOrganization(null);
        setIsAdmin(false);
        localStorage.removeItem('currentOrganization');
        localStorage.removeItem('isAdmin');
        return;
      }

      setCurrentOrganization(parsedOrg);
      setIsAdmin(data.role === 'admin');
    };

    validateAndSetOrganization();
  }, [session?.user?.id]);

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
    <OrganizationContext.Provider value={{ 
      currentOrganization, 
      isAdmin, 
      updateCurrentOrganization, 
      updateIsAdmin 
    }}>
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
