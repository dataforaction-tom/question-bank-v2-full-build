import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { supabase } from './supabaseClient'; // Add this import
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import SubmitQuestion from './pages/SubmitQuestion';
import Questions from './pages/Questions';
import QuestionDetail from './pages/QuestionDetail';
import QuestionRanking from './pages/QuestionRanking';
import Navbar from './components/Navbar';
import AuthRoute from './components/AuthRoute';
import OrganizationSignUp from './pages/OrganizationSignUp';
import OrganizationDashboard from './pages/OrganizationDashboard';
import AcceptInvitation from './pages/AcceptInvitation'; 
import UserProfile from './pages/UserProfile';
import MyQuestions from './pages/MyQuestions';
import { ThemeProvider } from './theme-context';
import './index.css';
import OrganizationELORanking from './components/OrganizationELORanking';
import OrganizationManualRanking from './components/OrganizationManualRanking';
import QuestionRankingModal from './components/QuestionRankingModal';

const App = () => {
  const { session } = useAuth();
  const [showRankingModal, setShowRankingModal] = useState(false);

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setShowRankingModal(true);
      }
    };

    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setShowRankingModal(true);
      }
    });

    return () => {
      if (authListener && authListener.unsubscribe) {
        authListener.unsubscribe();
      }
    };
  }, []);

  const handleRankingModalClose = () => {
    setShowRankingModal(false);
  };

  const handleRankingSubmitted = () => {
    setShowRankingModal(false);
  };

  return (
    <ThemeProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path='/signin' element={<SignIn />} />
          <Route path='/signup' element={<SignUp />} />
          <Route path='/accept-invitation' element={<AcceptInvitation />} />
          <Route path='/dashboard' element={<AuthRoute><Dashboard /></AuthRoute>} />
          <Route path='/organization-dashboard' element={<AuthRoute><OrganizationDashboard /></AuthRoute>} />
          <Route path='/create-organization' element={<AuthRoute><OrganizationSignUp /></AuthRoute>} />
          <Route path='/submit-question' element={<AuthRoute><SubmitQuestion /></AuthRoute>} />
          <Route path='/questions/:id' element={<AuthRoute><QuestionDetail /></AuthRoute>} />
          <Route path='/questions' element={<Questions />} />
          <Route path='/my-questions' element={<AuthRoute><MyQuestions /></AuthRoute>} />
          <Route path='/rank-questions' element={<AuthRoute><QuestionRanking /></AuthRoute>} />
          <Route path='/profile' element={<AuthRoute><UserProfile /></AuthRoute>} />
          <Route 
            path="/organization/:organizationId/elo-ranking" 
            element={
              <AuthRoute checkOrganization>
                <OrganizationELORanking />
              </AuthRoute>
            } 
          />
          <Route 
            path="/organization/:organizationId/manual-ranking" 
            element={
              <AuthRoute checkOrganization>
                <OrganizationManualRanking />
              </AuthRoute>
            } 
          />
          {/* Redirect root path to /questions */}
          <Route path="/" element={<Navigate replace to="/questions" />} />
          {/* Catch all route for any undefined paths */}
          <Route path="*" element={<Navigate replace to="/questions" />} />
        </Routes>
        <QuestionRankingModal 
          open={showRankingModal} 
          onClose={handleRankingModalClose}
          onSubmit={handleRankingSubmitted}
        />
      </Router>
    </ThemeProvider>
  );
};

export default App;
