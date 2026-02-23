import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './ProjectDetails.css';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
    fetchApplications();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/applications/project/${id}`);
      setApplications(response.data.applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to accept this application?')) {
      return;
    }

    try {
      await api.put(`/applications/${applicationId}/status`, { status: 'accepted' });
      
      // Find the application to get company details
      const acceptedApp = applications.find(app => app._id === applicationId);
      
      // Create conversation
      await api.post('/messages/start', {
        projectId: id,
        companyId: acceptedApp.company._id,
        applicationId: applicationId
      });
      
      alert('Application accepted! You can now message the company.');
      fetchProjectDetails();
      fetchApplications();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept application');
    }
  };

  const handleRejectApplication = async (applicationId) => {
    if (!window.confirm('Are you sure you want to reject this application?')) {
      return;
    }

    try {
      await api.put(`/applications/${applicationId}/status`, { status: 'rejected' });
      alert('Application rejected');
      fetchApplications();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject application');
    }
  };

  const handleStartChat = async (app) => {
    try {
      // Check if conversation already exists
      const convResponse = await api.get('/messages/conversations');
      const existingConv = convResponse.data.conversations.find(
        conv => conv.project._id === id && conv.company._id === app.company._id
      );
      
      if (existingConv) {
        navigate(`/messages/${existingConv._id}`);
      } else {
        // Create new conversation
        const response = await api.post('/messages/start', {
          projectId: id,
          companyId: app.company._id,
          applicationId: app._id
        });
        navigate(`/messages/${response.data.conversation._id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      accepted: '#10b981',
      rejected: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  if (!project) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="project-details-container">
      <Navbar />

      <div className="project-details-content">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>

        <div className="project-info-card">
          <div className="project-info-header">
            <h1>{project.title}</h1>
            <span className="status-badge" style={{ backgroundColor: getStatusColor(project.status) }}>
              {project.status}
            </span>
          </div>

          <p className="project-description">{project.description}</p>

          <div className="project-details-grid">
            <div className="detail-item">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{project.category}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Budget:</span>
              <span className="detail-value">${project.budget} ({project.budgetType})</span>
            </div>
            {project.duration && (
              <div className="detail-item">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{project.duration}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Applications:</span>
              <span className="detail-value">{project.applicantsCount}</span>
            </div>
          </div>

          {project.skills && project.skills.length > 0 && (
            <div className="project-skills-section">
              <h3>Required Skills:</h3>
              <div className="skills-container">
                {project.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="applications-section">
          <h2>Applications ({applications.length})</h2>

          {loading ? (
            <div className="loading">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="empty-state">
              <p>No applications yet.</p>
            </div>
          ) : (
            <div className="applications-list">
              {applications.map((app) => (
                <div key={app._id} className="application-card">
                  <div className="application-header">
                    <div className="company-info">
                      <div className="company-avatar">
                        {app.company.companyName?.charAt(0) || app.company.name?.charAt(0)}
                      </div>
                      <div>
                        <h3>{app.company.companyName || app.company.name}</h3>
                        <div className="company-meta">
                          <span>⭐ {app.company.rating.toFixed(1)}</span>
                          <span>• {app.company.jobsCompleted} jobs completed</span>
                          {app.company.verified && <span>• ✓ Verified</span>}
                          {app.company.location && <span>• 📍 {app.company.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="application-status">
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status) }}>
                        {app.status}
                      </span>
                    </div>
                  </div>

                  <div className="application-details">
                    <div className="detail-row">
                      <strong>Quotation:</strong> ${app.quotation}
                    </div>
                    {app.estimatedDuration && (
                      <div className="detail-row">
                        <strong>Estimated Duration:</strong> {app.estimatedDuration}
                      </div>
                    )}
                  </div>

                  <div className="cover-letter">
                    <h4>Cover Letter:</h4>
                    <p>{app.coverLetter}</p>
                  </div>

                  {app.portfolioLinks && app.portfolioLinks.length > 0 && (
                    <div className="portfolio-links">
                      <h4>Portfolio Links:</h4>
                      <ul>
                        {app.portfolioLinks.map((link, index) => (
                          <li key={index}>
                            <a href={link} target="_blank" rel="noopener noreferrer">
                              {link}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {app.attachments && app.attachments.length > 0 && (
                    <div className="attachments">
                      <h4>Attachments:</h4>
                      <ul>
                        {app.attachments.map((file, index) => (
                          <li key={index}>
                            <a 
                              href={`http://localhost:5000/${file.path}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              📎 {file.originalName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="application-footer">
                    <span className="application-date">
                      Applied {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                    {app.status === 'pending' && (
                      <div className="application-actions">
                        <button 
                          className="btn-reject" 
                          onClick={() => handleRejectApplication(app._id)}
                        >
                          Reject
                        </button>
                        <button 
                          className="btn-accept" 
                          onClick={() => handleAcceptApplication(app._id)}
                        >
                          Accept & Assign Work
                        </button>
                      </div>
                    )}
                    {app.status !== 'rejected' && (
                      <div className="application-actions">
                        <button 
                          className="btn-primary" 
                          onClick={() => handleStartChat(app)}
                          style={{ padding: '10px 20px' }}
                        >
                          💬 Chat with Company
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
