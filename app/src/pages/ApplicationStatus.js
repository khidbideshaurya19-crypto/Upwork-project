import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Dashboard.css';

const ApplicationStatus = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  const isCompany = user?.role === 'company';
  const isClient = user?.role === 'client';

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      if (isCompany) {
        // Get applications submitted by the company
        const response = await api.get('/applications/my-applications');
        setApplications(response.data.applications || []);
      } else if (isClient) {
        // For clients, fetch all their projects and get applications for each
        const projectsResponse = await api.get('/projects/my-projects');
        const projects = projectsResponse.data.projects || [];
        
        let allApplications = [];
        for (const project of projects) {
          try {
            const appResponse = await api.get(`/applications/project/${project._id}`);
            allApplications = [...allApplications, ...(appResponse.data.applications || [])];
          } catch (error) {
            console.error(`Error fetching applications for project ${project._id}:`, error);
          }
        }
        setApplications(allApplications);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#10b981',
      pending: '#f59e0b',
      accepted: '#10b981',
      rejected: '#ef4444',
      'in-progress': '#3b82f6'
    };
    return colors[status] || '#6b7280';
  };

  const handleStartChat = async (app) => {
    try {
      const convResponse = await api.get('/messages/conversations');
      const existingConv = convResponse.data.conversations.find(
        conv => conv.project._id === app.project._id
      );
      
      if (existingConv) {
        navigate(`/messages/${existingConv._id}`);
      } else {
        const response = await api.post('/messages/start', {
          projectId: app.project._id,
          applicationId: app._id
        });
        navigate(`/messages/${response.data.conversationId}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/project/${projectId}`);
  };

  const handleWithdrawApplication = async (appId) => {
    if (window.confirm('Are you sure you want to withdraw this application?')) {
      try {
        await api.delete(`/applications/${appId}`);
        setApplications(applications.filter(app => app._id !== appId));
      } catch (error) {
        console.error('Error withdrawing application:', error);
      }
    }
  };

  const filteredApplications = filterStatus === 'all' 
    ? applications 
    : applications.filter(app => app.status === filterStatus);

  const getUniqueStatuses = () => {
    const statuses = applications.map(app => app.status);
    return [...new Set(statuses)];
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="upw-page-title">
          <h1>{isCompany ? 'My Applications' : 'Received Applications'}</h1>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            {filteredApplications.length} {filterStatus === 'all' ? 'total' : filterStatus} application(s)
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="filters-container" style={{ marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              backgroundColor: filterStatus === 'all' ? '#f3f4f6' : 'white',
              cursor: 'pointer',
              fontWeight: filterStatus === 'all' ? '600' : '400'
            }}
          >
            All ({applications.length})
          </button>
          {getUniqueStatuses().map(status => (
            <button
              key={status}
              className={`filter-btn ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                backgroundColor: filterStatus === status ? '#f3f4f6' : 'white',
                cursor: 'pointer',
                fontWeight: filterStatus === status ? '600' : '400',
                textTransform: 'capitalize'
              }}
            >
              {status} ({applications.filter(app => app.status === status).length})
            </button>
          ))}
        </div>

        {/* Applications List */}
        <div className="upw-layout">
          <div className="upw-feed">
            {loading ? (
              <div className="loading">Loading applications...</div>
            ) : filteredApplications.length === 0 ? (
              <div className="empty-state">
                <p>
                  {isCompany 
                    ? "You haven't applied to any projects yet." 
                    : "No applications received yet."}
                </p>
                {isCompany && (
                  <button 
                    className="btn-primary" 
                    onClick={() => navigate('/dashboard')}
                  >
                    Browse Projects
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {filteredApplications.map((app) => (
                  <div key={app._id} className="upw-job-card" style={{ padding: '20px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, marginBottom: '4px' }}>
                          {app.project.title}
                        </h3>
                        <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
                          {isCompany ? 'Submitted' : 'From'}: {parseDate(app.createdAt)?.toLocaleDateString() || 'recently'}
                        </p>
                      </div>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status), color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                        {app.status}
                      </span>
                    </div>

                    {/* Application Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                      <div>
                        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Budget</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                          ${app.project.budget} {app.project.budgetType === 'fixed' ? '(Fixed)' : '(Hourly)'}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Category</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>{app.project.category}</p>
                      </div>

                      {!isCompany && (
                        <>
                          <div>
                            <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Company</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                              {app.company.companyName || app.company.name}
                            </p>
                          </div>
                          <div>
                            <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Rating</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                              {'⭐'.repeat(Math.floor(app.company.rating || 0))} ({(app.company.rating || 0).toFixed(1)})
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Description */}
                    {app.coverLetter && (
                      <div style={{ marginBottom: '16px' }}>
                        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, marginBottom: '4px' }}>Proposal</p>
                        <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.5', color: '#374151' }}>
                          {app.coverLetter}
                        </p>
                      </div>
                    )}

                    {/* Company Info - For Clients */}
                    {!isCompany && app.company && (
                      <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                        <p style={{ fontSize: '14px', margin: 0, marginBottom: '4px' }}>
                          <strong>{app.company.companyName || app.company.name}</strong>
                        </p>
                        {app.company.location && (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                            📍 {app.company.location}
                          </p>
                        )}
                        {app.company.description && (
                          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                            {app.company.description.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleViewProject(app.project._id)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#f3f4f6';
                        }}
                      >
                        View Project
                      </button>

                      {app.status === 'accepted' && (
                        <button
                          onClick={() => handleStartChat(app)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#3b82f6';
                          }}
                        >
                          💬 Send Message
                        </button>
                      )}

                      {isCompany && app.status === 'pending' && (
                        <button
                          onClick={() => handleWithdrawApplication(app._id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#fecaca';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = '#fee2e2';
                          }}
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationStatus;
