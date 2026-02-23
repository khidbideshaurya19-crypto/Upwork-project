import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-logo">
          <div className="logo-circle">M</div>
          <h1>MatchFlow</h1>
        </div>
        
        <p className="landing-subtitle">Join MatchFlow</p>
        
        <div className="role-cards">
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
            
            <button className="btn-client" onClick={() => navigate('/signup')}>
              Continue as Company
            </button>
          </div>
        </div>

        <div className="landing-footer">
          <p>Already have an account? <span onClick={() => navigate('/login')}>Login</span></p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
