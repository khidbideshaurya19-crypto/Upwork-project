import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Dashboard.css';

const Payments = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('accepted');

  useEffect(() => {
    fetchMyApplications();
  }, []);

  const fetchMyApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/applications/my-applications');
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'accepted') return app.status === 'accepted';
    if (activeFilter === 'pending') return app.status === 'pending';
    if (activeFilter === 'rejected') return app.status === 'rejected';
    return true;
  });

  const totalEarned = filteredApplications
    .filter(app => app.status === 'accepted')
    .reduce((sum, app) => sum + (app.quotation || 0), 0);

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      accepted: '#10b981',
      rejected: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="upw-page-title">
          <h1>Earnings & Payments</h1>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: '#fff',
            border: '1px solid #d5dff5',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 8px',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              Total Earned
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#0d6efd',
              margin: 0
            }}>
              ${totalEarned.toLocaleString()}
            </p>
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #d5dff5',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 8px',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              Accepted Projects
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#10b981',
              margin: 0
            }}>
              {applications.filter(a => a.status === 'accepted').length}
            </p>
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid #d5dff5',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <p style={{
              fontSize: '12px',
              color: '#6b7280',
              margin: '0 0 8px',
              textTransform: 'uppercase',
              fontWeight: '600'
            }}>
              Pending Projects
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#f59e0b',
              margin: 0
            }}>
              {applications.filter(a => a.status === 'pending').length}
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid #d5dff5',
          paddingBottom: '12px'
        }}>
          {['all', 'accepted', 'pending', 'rejected'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '8px 16px',
                background: activeFilter === filter ? '#0d6efd' : 'transparent',
                color: activeFilter === filter ? '#fff' : '#0f172a',
                border: activeFilter === filter ? 'none' : '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {filter === 'all' ? 'All Projects' : `${filter.charAt(0).toUpperCase()}${filter.slice(1)}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading">Loading applications...</div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state">
            <p>No applications found in this category.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '16px'
          }}>
            {filteredApplications.map((app) => (
              <div
                key={app._id}
                style={{
                  background: '#fff',
                  border: '1px solid #d5dff5',
                  borderRadius: '8px',
                  padding: '16px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0d6efd';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d5dff5';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '16px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#1f57c3',
                      margin: '0 0 4px',
                      cursor: 'pointer'
                    }}>
                      {app.project?.title}
                    </h3>
                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      margin: 0
                    }}>
                      Client: {app.project?.client?.name}
                    </p>
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    background: getStatusColor(app.status),
                    color: '#fff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    height: 'fit-content',
                    textTransform: 'capitalize'
                  }}>
                    {app.status}
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  padding: '12px 0',
                  borderTop: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  <div>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '0 0 4px'
                    }}>
                      Your Quotation
                    </p>
                    <p style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: app.status === 'accepted' ? '#10b981' : '#0f172a',
                      margin: 0
                    }}>
                      ${app.quotation}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '0 0 4px'
                    }}>
                      Est. Duration
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: '#0f172a',
                      margin: 0
                    }}>
                      {app.estimatedDuration || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      margin: '0 0 4px'
                    }}>
                      Applied On
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: '#0f172a',
                      margin: 0
                    }}>
                      {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: '12px 0 0',
                  lineHeight: '1.5'
                }}>
                  <strong>Cover Letter:</strong> {app.coverLetter}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
