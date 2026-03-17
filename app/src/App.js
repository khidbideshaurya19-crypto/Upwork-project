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
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminProjects from './pages/AdminProjects';
import AdminReports from './pages/AdminReports';
import AdminCompanyVerification from './pages/AdminCompanyVerification';
import AdminChatAlerts from './pages/AdminChatAlerts';
import PendingApproval from './pages/PendingApproval';
import ProjectWorkspace from './pages/ProjectWorkspace';
import MyContracts from './pages/MyContracts';
import PendingReviews from './pages/PendingReviews';
import Navbar from './components/Navbar';
import './App.css';

// Smart Dashboard that renders based on role
const SmartDashboard = () => {
  const { user } = useAuth();
  // Redirect unapproved companies to pending page
  if (user?.role === 'company' && user?.verificationStatus && user.verificationStatus !== 'approved') {
    return <Navigate to="/pending-approval" />;
  }
  if (user?.role === 'company') return <CompanyDashboard />;
  return <Dashboard />;
};

// Admin route wrapper - only allows admin users
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
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

          {/* Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminRoute>
                <Navbar />
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminRoute>
                <Navbar />
                <AdminUsers />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/projects" 
            element={
              <AdminRoute>
                <Navbar />
                <AdminProjects />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <AdminRoute>
                <Navbar />
                <AdminReports />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/company-verification" 
            element={
              <AdminRoute>
                <Navbar />
                <AdminCompanyVerification />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/chat-alerts" 
            element={
              <AdminRoute>
                <Navbar />
                <AdminChatAlerts />
              </AdminRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
