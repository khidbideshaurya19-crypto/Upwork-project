import React, { useEffect, useState, useCallback } from 'react';
import { getCancellationRequests, decideCancellationRequest } from '../utils/api';
import './Contracts.css';

const Contracts = () => {
  const [contracts, setContracts] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pendingAdminReview: 0, awaitingAdminDecision: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [decisionState, setDecisionState] = useState({ contractId: '', decision: '', reason: '' });

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCancellationRequests(statusFilter);
      setContracts(res.data.contracts || []);
      setCounts(res.data.counts || { total: 0, pendingAdminReview: 0, awaitingAdminDecision: 0 });
    } catch (err) {
      console.error('Fetch cancellation requests error:', err);
      alert(err.response?.data?.message || 'Failed to load cancellation requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const parseDate = (d) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleString();
  };

  const getRequestStatusLabel = (status) => {
    if (status === 'pending_admin_review') return 'Pending Company Response';
    if (status === 'awaiting_admin_decision') return 'Ready For Decision';
    if (status === 'approved_by_admin') return 'Approved';
    if (status === 'rejected_by_admin') return 'Rejected';
    return status || 'Unknown';
  };

  const handleOpenDecision = (contractId, decision) => {
    setDecisionState({ contractId, decision, reason: '' });
  };

  const handleSubmitDecision = async () => {
    if (!decisionState.contractId || !decisionState.decision) return;

    try {
      await decideCancellationRequest(decisionState.contractId, decisionState.decision, decisionState.reason);
      setDecisionState({ contractId: '', decision: '', reason: '' });
      fetchRequests();
      alert(`Cancellation request ${decisionState.decision}d successfully`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit decision');
    }
  };

  return (
    <div className="contracts-admin-container">
      <h1>Contract Cancellation Moderation</h1>

      <div className="contracts-summary-row">
        <div className="contracts-summary-card">Total: <strong>{counts.total}</strong></div>
        <div className="contracts-summary-card">Pending Response: <strong>{counts.pendingAdminReview}</strong></div>
        <div className="contracts-summary-card">Awaiting Decision: <strong>{counts.awaitingAdminDecision}</strong></div>
      </div>

      <div className="contracts-filter-row">
        <label htmlFor="statusFilter">Filter:</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Pending Requests</option>
          <option value="pending_admin_review">Pending Company Response</option>
          <option value="awaiting_admin_decision">Awaiting Admin Decision</option>
        </select>
      </div>

      {loading ? (
        <div className="contracts-loading">Loading requests...</div>
      ) : contracts.length === 0 ? (
        <div className="contracts-empty">No cancellation requests found.</div>
      ) : (
        <div className="contracts-list">
          {contracts.map((contract) => (
            <div key={contract._id} className="contracts-card">
              <div className="contracts-card-top">
                <h3>{contract.project?.title || 'Untitled Project'}</h3>
                <span className={`request-status-badge status-${contract.cancelRequestStatus || 'unknown'}`}>
                  {getRequestStatusLabel(contract.cancelRequestStatus)}
                </span>
              </div>

              <div className="contracts-grid">
                <div>
                  <div><strong>Client:</strong> {contract.client?.name || 'N/A'} ({contract.client?.email || 'N/A'})</div>
                  <div><strong>Company:</strong> {contract.company?.companyName || contract.company?.name || 'N/A'} ({contract.company?.email || 'N/A'})</div>
                  <div><strong>Requested At:</strong> {parseDate(contract.cancelRequestedAt)}</div>
                </div>
                <div>
                  <div><strong>Reason:</strong> {contract.cancelRequestReason || 'N/A'}</div>
                  <div><strong>Company Response:</strong> {contract.cancelResponse || 'Awaiting response'}</div>
                  <div><strong>Current Contract Status:</strong> {contract.status}</div>
                </div>
              </div>

              <div className="contracts-actions">
                <button className="btn-approve" onClick={() => handleOpenDecision(contract._id, 'approve')}>
                  Approve Cancellation
                </button>
                <button className="btn-reject" onClick={() => handleOpenDecision(contract._id, 'reject')}>
                  Reject Cancellation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {decisionState.contractId && (
        <div className="contracts-modal-overlay" onClick={() => setDecisionState({ contractId: '', decision: '', reason: '' })}>
          <div className="contracts-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{decisionState.decision === 'approve' ? 'Approve' : 'Reject'} Cancellation Request</h2>
            <p>Add optional admin reason for audit trail.</p>
            <textarea
              value={decisionState.reason}
              onChange={(e) => setDecisionState((prev) => ({ ...prev, reason: e.target.value }))}
              rows={4}
              placeholder="Admin notes..."
            />
            <div className="contracts-modal-actions">
              <button className="btn-confirm" onClick={handleSubmitDecision}>Submit Decision</button>
              <button className="btn-cancel" onClick={() => setDecisionState({ contractId: '', decision: '', reason: '' })}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
