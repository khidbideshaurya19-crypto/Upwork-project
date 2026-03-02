import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const PendingApproval = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const status = user?.verificationStatus || 'pending';
  const tier = user?.verificationTier || {};

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tierChecks = [
    { label: 'Business domain email', key: 'domainEmail', icon: tier.domainEmail ? '✅' : '❌' },
    { label: 'Company website', key: 'websiteCheck', icon: tier.websiteCheck ? '✅' : '❌' },
    { label: 'LinkedIn presence', key: 'linkedinPresence', icon: tier.linkedinPresence ? '✅' : '❌' }
  ];

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '540px' }}>
        <div className="auth-header">
          <h1>MatchFlow</h1>

          {status === 'pending' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <h2>Account Pending Approval</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: '8px' }}>
                Thank you for registering! Your company account is being reviewed by our admin team.
                You'll be able to log in once your account is approved.
              </p>
            </>
          )}

          {status === 'rejected' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
              <h2 style={{ color: '#dc2626' }}>Account Rejected</h2>
              <p style={{ color: '#6b7280', lineHeight: 1.6, marginTop: '8px' }}>
                Unfortunately, your company account was not approved.
              </p>
              {user?.adminRejectionReason && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px',
                  padding: '12px 16px', marginTop: '12px', color: '#991b1b', fontSize: '14px', textAlign: 'left'
                }}>
                  <strong>Reason:</strong> {user.adminRejectionReason}
                </div>
              )}
            </>
          )}
        </div>

        {/* Tier 1 Verification Checks */}
        <div style={{
          background: '#f8fafc', borderRadius: '10px', padding: '20px',
          marginTop: '20px', border: '1px solid #e2e8f0'
        }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 600, color: '#334155' }}>
            Tier 1 — Auto Verification Checks
          </h3>
          {tierChecks.map((check, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '8px 0', borderBottom: i < tierChecks.length - 1 ? '1px solid #e2e8f0' : 'none'
            }}>
              <span style={{ fontSize: '18px' }}>{check.icon}</span>
              <span style={{ fontSize: '14px', color: '#334155' }}>{check.label}</span>
            </div>
          ))}
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '12px 0 0' }}>
            {tier.passed || 0} of {tier.total || 3} checks passed — Admin will do final review
          </p>
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => navigate('/login')}
          >
            Go to Login
          </button>
          <button
            className="btn-primary"
            style={{ flex: 1, background: '#6b7280' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
