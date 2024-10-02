import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import QuestionRanking from '../pages/QuestionRanking';

const QuestionRankingModal = ({ open, onClose, onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const lastShown = localStorage.getItem('questionRankingModalLastShown');
        const currentTime = new Date().getTime();
        
        if (!lastShown || currentTime - parseInt(lastShown) > 24 * 60 * 60 * 1000) {
          setIsOpen(true);
          localStorage.setItem('questionRankingModalLastShown', currentTime.toString());
        }
      }
    };

    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        checkUserSession();
      }
    });

    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleSubmit = () => {
    setIsOpen(false);
    if (typeof onSubmit === 'function') {
      onSubmit();
    }
  };

  return (
    <QuestionRanking open={isOpen} onClose={handleClose} onSubmit={handleSubmit} />
  );
};

export default QuestionRankingModal;
