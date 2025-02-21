import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const OrganizationContext = createContext();

export const OrganizationProvider = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const validateAndSetOrganization = async () => {
      const storedOrg = localStorage.getItem('currentOrganization');
      if (!storedOrg || !session?.user?.id) return;

      const parsedOrg = JSON.parse(storedOrg);

      // First, check organization's subscription status
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_status')
        .eq('id', parsedOrg.id)
        .single();

      if (orgError) {
        console.error('Error fetching organization status:', orgError);
        setCurrentOrganization(null);
        setIsAdmin(false);
        setSubscriptionStatus(null);
        localStorage.removeItem('currentOrganization');
        localStorage.removeItem('isAdmin');
        navigate('/billing-required');
        return;
      }

      // If subscription is inactive, redirect to billing page
      if (orgData.subscription_status === 'inactive') {
        setSubscriptionStatus('inactive');
        navigate('/billing-required');
        return;
      }

      // Continue with user access validation
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
        setSubscriptionStatus(null);
        localStorage.removeItem('currentOrganization');
        localStorage.removeItem('isAdmin');
        return;
      }

      setCurrentOrganization(parsedOrg);
      setIsAdmin(data.role === 'admin');
      setSubscriptionStatus(orgData.subscription_status);
    };

    validateAndSetOrganization();
  }, [session?.user?.id, navigate]);

  const updateCurrentOrganization = async (org) => {
    if (org) {
      // Check subscription status before updating
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('subscription_status')
        .eq('id', org.id)
        .single();

      if (orgError || orgData.subscription_status === 'inactive') {
        setSubscriptionStatus('inactive');
        navigate('/billing-required');
        return;
      }

      setCurrentOrganization(org);
      setSubscriptionStatus(orgData.subscription_status);
      localStorage.setItem('currentOrganization', JSON.stringify(org));
      navigate(`/group-dashboard/${org.id}`, { replace: true });
    } else {
      setCurrentOrganization(null);
      setSubscriptionStatus(null);
      localStorage.removeItem('currentOrganization');
      localStorage.removeItem('isAdmin');
      navigate('/group-dashboard', { replace: true });
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
      subscriptionStatus,
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
