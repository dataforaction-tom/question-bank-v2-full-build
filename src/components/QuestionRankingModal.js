import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import QuestionRanking from '../pages/QuestionRanking';

const QuestionRankingModal = ({ open, onClose, onSubmit }) => {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsOpen(true);
      }
    };

    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setIsOpen(true);
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
