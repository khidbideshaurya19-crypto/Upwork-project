import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import './AdminUsers.css';

const AdminCompanyVerification = () => {
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const parseDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      const endpoint = statusFilter === 'pending'
        ? '/admin/companies/pending'
        : `/admin/companies/all?status=${statusFilter}`;
      const response = await api.get(endpoint);
      setCompanies(response.data.companies);
    } catch (err) {
      console.error('Fetch companies error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleApprove = async (companyId) => {
    if (!window.confirm('Approve this company? They will be able to log in and use the platform.')) return;
    try {
      setActionLoading(true);
      await api.put(`/admin/companies/${companyId}/approve`);
      fetchCompanies();
      alert('Company approved successfully!');
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (companyId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    try {
      setActionLoading(true);
      await api.put(`/admin/companies/${companyId}/reject`, { reason: rejectReason });
      setSelectedCompany(null);
      setRejectReason('');
      fetchCompanies();
      alert('Company rejected.');
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
      approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' }
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{
        background: s.bg, color: s.color,
        padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600
      }}>
        {s.label}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    if (!tier) return <span style={{ color: '#94a3b8', fontSize: '12px' }}>No data</span>;
    const passed = tier.passed || 0;
    const total = tier.total || 3;
    const color = passed >= 3 ? '#059669' : passed >= 2 ? '#d97706' : '#dc2626';
    return (
      <span style={{
        background: `${color}15`, color, padding: '4px 10px',
        borderRadius: '12px', fontSize: '12px', fontWeight: 600
      }}>
        {passed}/{total} checks
      </span>
    );
  };

  if (isLoading && companies.length === 0) {
    return <div className="adm-container"><div className="loading">Loading companies...</div></div>;
  }

  return (
    <div className="adm-container">
      <div className="adm-content">
        <div className="adm-page-title">
          <h1>Company Verification</h1>
          <p className="adm-page-subtitle">Review and approve company registrations</p>
        </div>

        <div className="adm-toolbar">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="adm-select"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <span className="adm-count-badge">
            {companies.length} {statusFilter} companies
          </span>
        </div>

        {companies.length === 0 ? (
          <div className="adm-section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              {statusFilter === 'pending'
                ? 'No companies waiting for approval 🎉'
                : `No ${statusFilter} companies found.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {companies.map((company) => (
              <div key={company._id} className="adm-section-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  {/* Left: Company Info */}
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#0f172a' }}>
                        {company.companyName || company.name}
                      </h3>
                      {getStatusBadge(company.verificationStatus)}
                      {getTierBadge(company.verificationTier)}
                    </div>

                    <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.7 }}>
                      <p style={{ margin: '2px 0' }}><strong>Contact:</strong> {company.name} — {company.email}</p>
                      {company.location && <p style={{ margin: '2px 0' }}><strong>Location:</strong> {company.location}</p>}
                      {company.description && <p style={{ margin: '2px 0' }}><strong>About:</strong> {company.description}</p>}
                      <p style={{ margin: '2px 0' }}><strong>Registered:</strong> {parseDate(company.createdAt)}</p>
                    </div>
                  </div>

                  {/* Right: Verification Details */}
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                    padding: '14px', minWidth: '260px'
                  }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tier 1 Checks
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{company.verificationTier?.domainEmail ? '✅' : '❌'}</span>
                        <span>Business domain email</span>
                        <span style={{ marginLeft: 'auto', color: '#94a3b8', fontSize: '12px' }}>
                          {company.email?.split('@')[1]}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{company.verificationTier?.websiteCheck ? '✅' : '❌'}</span>
                        <span>Company website</span>
                        {company.websiteUrl && (
                          <a href={company.websiteUrl.startsWith('http') ? company.websiteUrl : `https://${company.websiteUrl}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ marginLeft: 'auto', color: '#0d6efd', fontSize: '12px', textDecoration: 'none' }}>
                            {company.websiteUrl}
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{company.verificationTier?.linkedinPresence ? '✅' : '❌'}</span>
                        <span>LinkedIn presence</span>
                        {company.linkedinUrl && (
                          <a href={company.linkedinUrl.startsWith('http') ? company.linkedinUrl : `https://${company.linkedinUrl}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ marginLeft: 'auto', color: '#0d6efd', fontSize: '12px', textDecoration: 'none' }}>
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {company.verificationStatus === 'pending' && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
                    <button
                      className="adm-action-btn adm-action-btn--success"
                      style={{ padding: '8px 24px', fontSize: '14px' }}
                      disabled={actionLoading}
                      onClick={() => handleApprove(company._id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="adm-action-btn adm-action-btn--danger"
                      style={{ padding: '8px 24px', fontSize: '14px' }}
                      onClick={() => setSelectedCompany(company._id)}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}

                {company.verificationStatus === 'rejected' && company.adminRejectionReason && (
                  <div style={{
                    marginTop: '12px', padding: '10px 14px', background: '#fef2f2',
                    border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#991b1b'
                  }}>
                    <strong>Rejection reason:</strong> {company.adminRejectionReason}
                  </div>
                )}

                {company.verificationStatus === 'approved' && (
                  <div style={{
                    marginTop: '12px', padding: '10px 14px', background: '#f0fdf4',
                    border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px', color: '#166534'
                  }}>
                    ✓ Approved {company.adminApprovedAt ? `on ${parseDate(company.adminApprovedAt)}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {selectedCompany && (
        <div className="adm-overlay" onClick={() => { setSelectedCompany(null); setRejectReason(''); }}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Reject Company</h2>
            <p className="adm-modal-desc">Provide a reason for rejecting this company registration:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Unable to verify company identity, Invalid website URL..."
              className="adm-textarea"
              rows={4}
            />
            <div className="adm-modal-footer">
              <button
                className="adm-action-btn adm-action-btn--danger"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={() => handleReject(selectedCompany)}
              >
                Reject Company
              </button>
              <button
                className="adm-action-btn adm-action-btn--ghost"
                onClick={() => { setSelectedCompany(null); setRejectReason(''); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompanyVerification;
