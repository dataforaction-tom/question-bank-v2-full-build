import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
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
import QuestionOverview from './pages/QuestionOverview';
import GroupMembers from './pages/GroupMembers';
import { OrganizationProvider } from './context/OrganizationContext';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from './stripe';
import BillingRequired from './pages/BillingRequired';



const App = () => {
  const {session} = useAuth();

  return (
    <Elements stripe={stripePromise}>
      <ThemeProvider>
        <Router>
          <OrganizationProvider>
            <Navbar />
            <Routes>
              <Route path='/signin' element={<SignIn />} />
              <Route path='/signup' element={<SignUp />} />
              <Route path='/accept-invitation' element={<AcceptInvitation />} />
              <Route path='/dashboard' element={<AuthRoute><Dashboard /></AuthRoute>} />
              <Route 
                path='/group-dashboard/:organizationId?' 
                element={
                  <AuthRoute>
                    <OrganizationDashboard />
                  </AuthRoute>
                }
              />
              <Route path='/create-group' element={<AuthRoute><OrganizationSignUp /></AuthRoute>} />
              <Route path='/submit-question' element={<AuthRoute><SubmitQuestion /></AuthRoute>} />
              <Route path='/questions/:id' element={<QuestionDetail />} />
              <Route path='/questions' element={<Questions />} />
              <Route path='/my-questions' element={<AuthRoute><MyQuestions /></AuthRoute>} />
              <Route path='/rank-questions' element={<AuthRoute><QuestionRanking /></AuthRoute>} />
              <Route path='/profile' element={<AuthRoute><UserProfile /></AuthRoute>} />
              <Route path='/group-members/:organizationId' element={<AuthRoute><GroupMembers /></AuthRoute>} />
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
             
              <Route path="/" element={<Navigate replace to="/question-overview" />} />
              
              <Route path="*" element={<Navigate replace to="/question-overview" />} />
              <Route path="/question-overview" element={<QuestionOverview />} />
              <Route path='/billing-required' element={<BillingRequired />} />
            </Routes>
            <QuestionRankingModal />
          </OrganizationProvider>
        </Router>
      </ThemeProvider>
    </Elements>
  );
};

export default App;
