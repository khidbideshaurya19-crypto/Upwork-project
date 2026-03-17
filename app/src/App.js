import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import PrivateRoute from './components/PrivateRoute';
import RoleSelection from './pages/RoleSelection';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import PostProject from './pages/PostProject';
import ProjectDetails from './pages/ProjectDetails';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import SearchCompany from './pages/SearchCompany';
import Payments from './pages/Payments';
import ApplicationStatus from './pages/ApplicationStatus';
import Notifications from './pages/Notifications';
import PendingApproval from './pages/PendingApproval';
import ProjectWorkspace from './pages/ProjectWorkspace';
import MyContracts from './pages/MyContracts';
import PendingReviews from './pages/PendingReviews';
import './App.css';

const SmartDashboard = () => {
  const { user } = useAuth();

  if (user?.role === 'company' && user?.verificationStatus && user.verificationStatus !== 'approved') {
    return <Navigate to="/pending-approval" />;
  }

  if (user?.role === 'company') return <CompanyDashboard />;
  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/get-started" element={<RoleSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <SmartDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/post-project"
            element={
              <PrivateRoute>
                <PostProject />
              </PrivateRoute>
            }
          />
          <Route
            path="/project/:id"
            element={
              <PrivateRoute>
                <ProjectDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/workspace/:contractId"
            element={
              <PrivateRoute>
                <ProjectWorkspace />
              </PrivateRoute>
            }
          />
          <Route
            path="/contracts"
            element={
              <PrivateRoute>
                <MyContracts />
              </PrivateRoute>
            }
          />
          <Route
            path="/reviews/pending"
            element={
              <PrivateRoute>
                <PendingReviews />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            }
          />
          <Route
            path="/messages/:conversationId"
            element={
              <PrivateRoute>
                <Messages />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/user/:userId"
            element={
              <PrivateRoute>
                <UserProfile />
              </PrivateRoute>
            }
          />
          <Route
            path="/search-company"
            element={
              <PrivateRoute>
                <SearchCompany />
              </PrivateRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <PrivateRoute>
                <Payments />
              </PrivateRoute>
            }
          />
          <Route
            path="/application-status"
            element={
              <PrivateRoute>
                <ApplicationStatus />
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <Notifications />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
