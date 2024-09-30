import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

const App = () => {
  const { session } = useAuth();

  return (
    <ThemeProvider>
      <Router>
        {session && <Navbar />}
        <Routes>
          <Route path='/signin' element={<SignIn />} />
          <Route path='/signup' element={<SignUp />} />
          <Route path='/accept-invitation' element={<AcceptInvitation />} />
          <Route path='/' element={<AuthRoute><Dashboard /></AuthRoute>} />
          <Route path='/organization-dashboard' element={<AuthRoute><OrganizationDashboard /></AuthRoute>} />
          <Route path='/create-organization' element={<AuthRoute><OrganizationSignUp /></AuthRoute>} />
          <Route path='/submit-question' element={<AuthRoute><SubmitQuestion /></AuthRoute>} />
          <Route path='/questions/:id' element={<AuthRoute><QuestionDetail /></AuthRoute>} />
          <Route path='/questions' element={<AuthRoute><Questions /></AuthRoute>} />
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
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
