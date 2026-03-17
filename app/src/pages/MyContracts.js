import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './ProjectWorkspace.css';

const MyContracts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/contracts');
      setContracts(res.data.contracts);
    } catch (err) {
      console.error('Fetch contracts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseDate = (d) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString();
  };

  const getContractStatusLabel = (status) => {
    switch (status) {
      case 'active': return '● Active';
      case 'completed': return '✓ Completed';
      case 'disputed': return '⚠ Disputed';
      case 'cancellation-requested': return '⏳ Cancel Requested';
      case 'cancelled': return '✕ Cancelled';
      default: return status || 'Unknown';
    }
  };

  const filtered = filter === 'all' ? contracts : contracts.filter(c => c.status === filter);
  const isClient = user?.role === 'client';

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="ws-container">
        <div className="ws-header">
          <div>
            <h1 className="ws-title">My Contracts</h1>
            <p className="ws-subtitle">{contracts.length} total contracts</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['all', 'active', 'disputed', 'cancellation-requested', 'completed', 'cancelled'].map(f => (
              <button
                key={f}
                className={`ws-action-btn ${filter === f ? 'ws-btn-blue' : 'ws-btn-gray'}`}
                onClick={() => setFilter(f)}
                style={{ textTransform: 'capitalize' }}
              >{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="ws-loading">Loading contracts...</div>
        ) : filtered.length === 0 ? (
          <div className="ws-empty">
            <p>No {filter !== 'all' ? filter : ''} contracts found.</p>
          </div>
        ) : (
          <div className="contracts-list">
            {filtered.map(c => (
              <div
                key={c._id}
                className="contract-card"
                onClick={() => navigate(`/workspace/${c._id}`)}
              >
                <div className="contract-card-header">
                  <h3 className="contract-card-title">{c.project?.title || 'Untitled Project'}</h3>
                  <span className={`ws-status-badge ws-status-${c.status}`}>
                    {getContractStatusLabel(c.status)}
                  </span>
                </div>
                <p className="contract-card-meta">
                  {isClient
                    ? `Company: ${c.company?.companyName || c.company?.name || 'N/A'}`
                    : `Client: ${c.client?.name || 'N/A'}`}
                  {' · '}
                  Budget: ${c.agreedBudget} ({c.budgetType})
                  {' · '}
                  Started: {parseDate(c.startDate)}
                </p>
                {c.project?.skills && c.project.skills.length > 0 && (
                  <div className="ws-skills" style={{ marginTop: '8px' }}>
                    {c.project.skills.slice(0, 5).map((s, i) => (
                      <span key={i} className="ws-skill-tag">{s}</span>
                    ))}
                    {c.project.skills.length > 5 && (
                      <span style={{ fontSize: '11px', color: '#0d6efd' }}>+{c.project.skills.length - 5}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyContracts;
