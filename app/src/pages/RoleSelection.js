import React from 'react';
import { useNavigate } from 'react-router-dom';
import './RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <div className="role-selection-logo">
          <div className="logo-circle">M</div>
          <h1>MatchFlow</h1>
        </div>
        
        <p className="role-selection-subtitle">Join MatchFlow as</p>
        
        <div className="role-cards">
          <div className="role-card">
            <div className="role-icon" style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2"/>
                <circle cx="12" cy="7" r="4" strokeWidth="2"/>
              </svg>
            </div>
            <h2>I'm a Client</h2>
            <p>Post projects, hire companies, and get your work done</p>
            
            <ul className="features-list">
              <li>✓ Post unlimited projects</li>
              <li>✓ AI-powered matching</li>
              <li>✓ Secure payments</li>
              <li>✓ Quality assurance</li>
            </ul>
            
            <button className="btn-client" onClick={() => navigate('/signup?role=client')}>
              Continue as Client
            </button>
          </div>

          <div className="role-card">
            <div className="role-icon" style={{ backgroundColor: '#fef3c7', color: '#f59e0b' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                <path d="M3 9h18" strokeWidth="2"/>
                <path d="M9 21V9" strokeWidth="2"/>
              </svg>
            </div>
            <h2>I'm a Company</h2>
            <p>Browse projects, apply to work, and grow your business</p>
            
            <ul className="features-list">
              <li>✓ Access to verified projects</li>
              <li>✓ Trust-based ranking</li>
              <li>✓ Easy invoicing</li>
              <li>✓ Growth analytics</li>
            </ul>
            
            <button className="btn-company" onClick={() => navigate('/signup?role=company')}>
              Continue as Company
            </button>
          </div>
        </div>

        <div className="role-selection-footer">
          <p>Already have an account? <span onClick={() => navigate('/login')}>Login</span></p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
