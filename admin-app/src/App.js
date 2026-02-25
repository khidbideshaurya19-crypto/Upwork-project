import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Projects from './pages/Projects';
import Reports from './pages/Reports';

import './App.css';

function App() {
  return (
    <Router>
      <AdminProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <>
                  <Navbar />
                  <Navigate to="/dashboard" />
                </>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <>
                  <Navbar />
                  <Dashboard />
                </>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/users" 
            element={
              <PrivateRoute>
                <>
                  <Navbar />
                  <Users />
                </>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/projects" 
            element={
              <PrivateRoute>
                <>
                  <Navbar />
                  <Projects />
                </>
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/reports" 
            element={
              <PrivateRoute>
                <>
                  <Navbar />
                  <Reports />
                </>
              </PrivateRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AdminProvider>
    </Router>
  );
}

export default App;
