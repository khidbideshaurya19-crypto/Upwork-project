import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import './AdminChatAlerts.css';

const AdminChatAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, reviewed: 0, dismissed: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (severityFilter) params.severity = severityFilter;
      const response = await api.get('/admin/chat-alerts', { params });
      setAlerts(response.data.alerts);
      setCounts(response.data.counts);
      setTotalPages(response.data.pagination.pages);
      setError('');
    } catch (err) {
      setError('Failed to load chat alerts');
      console.error('Chat alerts error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, severityFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleReview = async (alertId, action) => {
    try {
      await api.put(`/admin/chat-alerts/${alertId}/review`, { action, adminNotes });
      setAdminNotes('');
      setSelectedAlert(null);
      fetchAlerts();
    } catch (err) {
      alert('Failed to update alert: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Delete this alert permanently?')) return;
    try {
      await api.delete(`/admin/chat-alerts/${alertId}`);
      fetchAlerts();
    } catch (err) {
      alert('Failed to delete alert');
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  };

  const getSeverityClass = (severity) => {
    const map = { high: 'adm-pill--high', medium: 'adm-pill--medium', low: 'adm-pill--low' };
    return map[severity] || '';
  };

  const getStatusClass = (status) => {
    const map = { pending: 'adm-pill--pending', reviewed: 'adm-pill--reviewed', dismissed: 'adm-pill--dismissed' };
    return map[status] || '';
  };

  if (isLoading && alerts.length === 0) {
    return <div className="adm-container"><div className="loading">Loading chat alerts...</div></div>;
  }

  if (error) {
    return <div className="adm-container"><div className="adm-error-banner">{error}</div></div>;
  }

  return (
    <div className="adm-container">
      <div className="adm-content">
        <div className="adm-page-title">
          <h1>🚨 Chat Moderation Alerts</h1>
          <p className="adm-page-subtitle">Messages flagged for potential outside-platform activity</p>
        </div>

        {/* Summary Cards */}
        <div className="adm-stats-row">
          <div className="adm-stat-card">
            <span className="adm-stat-icon">📋</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Total Alerts</span>
              <span className="adm-stat-value">{counts.total}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">⏳</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Pending</span>
              <span className="adm-stat-value">{counts.pending}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">✅</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Reviewed</span>
              <span className="adm-stat-value">{counts.reviewed}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">❌</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Dismissed</span>
              <span className="adm-stat-value">{counts.dismissed}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="adm-alerts-filters">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="adm-filter-select"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="adm-filter-select"
          >
            <option value="">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Alerts Table */}
        {alerts.length === 0 ? (
          <div className="adm-section-card">
            <div className="adm-empty">✅ No flagged messages found. All chats look clean!</div>
          </div>
        ) : (
          <div className="adm-section-card">
            <div className="adm-section-header">
              <h2>Flagged Messages</h2>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sender</th>
                    <th>Conversation</th>
                    <th>Message</th>
                    <th>Reasons</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert._id} className={`adm-alert-row adm-severity-${alert.severity}`}>
                      <td className="adm-cell-date">{parseDate(alert.createdAt)}</td>
                      <td>
                        <div className="adm-cell-name">{alert.senderInfo?.name || 'Unknown'}</div>
                        <div className="adm-cell-email">{alert.senderInfo?.email}</div>
                        <span className={`adm-pill adm-pill--${alert.senderRole}`}>{alert.senderRole}</span>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          <div><strong>Client:</strong> {alert.conversationInfo?.client?.name || 'N/A'}</div>
                          <div><strong>Company:</strong> {alert.conversationInfo?.company?.name || alert.conversationInfo?.company?.companyName || 'N/A'}</div>
                        </div>
                      </td>
                      <td>
                        <div className="adm-message-preview">{alert.messageContent}</div>
                      </td>
                      <td>
                        <ul className="adm-reasons-list">
                          {(alert.reasons || []).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </td>
                      <td><span className={`adm-pill ${getSeverityClass(alert.severity)}`}>{alert.severity}</span></td>
                      <td><span className={`adm-pill ${getStatusClass(alert.status)}`}>{alert.status}</span></td>
                      <td className="adm-actions-cell">
                        {alert.status === 'pending' && (
                          <button className="adm-btn adm-btn--primary" onClick={() => setSelectedAlert(alert)}>
                            Review
                          </button>
                        )}
                        <button className="adm-btn adm-btn--danger" onClick={() => handleDelete(alert._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="adm-pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}

        {/* Review Modal */}
        {selectedAlert && (
          <div className="adm-modal-overlay" onClick={() => setSelectedAlert(null)}>
            <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Review Alert</h2>

              <div className="adm-modal-field">
                <label>Sender</label>
                <span>{selectedAlert.senderInfo?.name} ({selectedAlert.senderRole})</span>
              </div>

              <div className="adm-modal-field">
                <label>Flagged Message</label>
                <div className="adm-modal-message">{selectedAlert.messageContent}</div>
              </div>

              <div className="adm-modal-field">
                <label>Flagged For</label>
                <ul className="adm-reasons-list">
                  {(selectedAlert.reasons || []).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="adm-modal-field">
                <label>Severity</label>
                <span className={`adm-pill ${getSeverityClass(selectedAlert.severity)}`}>{selectedAlert.severity}</span>
              </div>

              <div className="adm-modal-field">
                <label>Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this alert..."
                  rows={3}
                />
              </div>

              <div className="adm-modal-actions">
                <button className="adm-btn adm-btn--success" onClick={() => handleReview(selectedAlert._id, 'reviewed')}>
                  ✅ Mark Reviewed
                </button>
                <button className="adm-btn adm-btn--secondary" onClick={() => handleReview(selectedAlert._id, 'dismissed')}>
                  ❌ Dismiss
                </button>
                <button className="adm-btn" onClick={() => { setSelectedAlert(null); setAdminNotes(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatAlerts;
