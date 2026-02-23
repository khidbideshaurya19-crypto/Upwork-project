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
            <div className="role-icon client-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" strokeWidth="2"/>
              </svg>
            </div>
            <h2>I'm a Client</h2>
            <p>Post projects and find verified companies to build with</p>
            
            <ul className="features-list">
              <li>✓ Post unlimited projects</li>
              <li>✓ AI-powered matching</li>
              <li>✓ Secure payments</li>
              <li>✓ Dispute resolution</li>
            </ul>
            
            <button className="btn-client" onClick={() => navigate('/signup')}>
              Continue as Client
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
