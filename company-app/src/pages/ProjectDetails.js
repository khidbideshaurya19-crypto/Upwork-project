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
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [formData, setFormData] = useState({
    quotation: '',
    coverLetter: '',
    estimatedDuration: '',
    portfolioLinks: ''
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [myApplication, setMyApplication] = useState(null);

  useEffect(() => {
    fetchProjectDetails();
    checkIfApplied();
  }, [id]);

  const fetchProjectDetails = async () => {
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data.project);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfApplied = async () => {
    try {
      const response = await api.get('/applications/my-applications');
      const application = response.data.applications.find(app => app.project._id === id);
      if (application) {
        setHasApplied(true);
        setMyApplication(application);
      }
    } catch (error) {
      console.error('Error checking application:', error);
    }
  };

  const handleStartChat = async () => {
    try {
      // Check if conversation already exists
      const convResponse = await api.get('/messages/conversations');
      const existingConv = convResponse.data.conversations.find(
        conv => conv.project._id === id
      );
      
      if (existingConv) {
        navigate(`/messages/${existingConv._id}`);
      } else {
        alert('Conversation not yet available. The client will create it when they accept your application.');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('quotation', formData.quotation);
      formDataToSend.append('coverLetter', formData.coverLetter);
      formDataToSend.append('estimatedDuration', formData.estimatedDuration);
      
      // Parse portfolio links
      if (formData.portfolioLinks) {
        const links = formData.portfolioLinks.split('\n').filter(link => link.trim());
        formDataToSend.append('portfolioLinks', JSON.stringify(links));
      }

      // Add files
      files.forEach(file => {
        formDataToSend.append('attachments', file);
      });

      await api.post(`/applications/${id}`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccess('Application submitted successfully!');
      setShowApplyForm(false);
      setHasApplied(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!project) {
    return <div className="error-message">Project not found</div>;
  }

  return (
    <div className="project-details-container">
      <Navbar />

      <div className="project-details-content">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          ← Back to Projects
        </button>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <div className="project-info-card">
          <div className="project-info-header">
            <h1>{project.title}</h1>
            <span className="status-badge" style={{ backgroundColor: '#10b981' }}>
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
              <span className="detail-label">Applicants:</span>
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

          <div className="project-client-info" style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '8px', color: '#1f2937' }}>Client Information</h3>
            <p><strong>Name:</strong> {project.client.name}</p>
            {project.client.location && <p><strong>Location:</strong> {project.client.location}</p>}
            <p><strong>Jobs Posted:</strong> {project.client.jobsPosted}</p>
          </div>

          {!hasApplied && project.status === 'open' && (
            <button 
              className="btn-primary" 
              style={{ marginTop: '24px', width: '100%' }}
              onClick={() => setShowApplyForm(true)}
            >
              Apply to this Project
            </button>
          )}

          {hasApplied && (
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, padding: '16px', backgroundColor: '#d1fae5', borderRadius: '8px', color: '#059669', textAlign: 'center' }}>
                ✓ You have applied to this project
                {myApplication?.status && (
                  <div style={{ marginTop: '8px', fontSize: '14px' }}>
                    Status: <strong>{myApplication.status}</strong>
                  </div>
                )}
              </div>
              {myApplication?.status === 'accepted' && (
                <button 
                  className="btn-primary" 
                  onClick={handleStartChat}
                  style={{ padding: '16px 24px' }}
                >
                  💬 Chat with Client
                </button>
              )}
            </div>
          )}
        </div>

        {showApplyForm && (
          <div className="apply-form-section" style={{ marginTop: '32px' }}>
            <div className="project-info-card">
              <h2 style={{ marginBottom: '24px' }}>Submit Your Application</h2>
              
              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="quotation">Your Quotation ($) *</label>
                  <input
                    type="number"
                    id="quotation"
                    name="quotation"
                    value={formData.quotation}
                    onChange={handleChange}
                    required
                    min="0"
                    step="1"
                    placeholder="Enter your quoted price"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="estimatedDuration">Estimated Duration</label>
                  <input
                    type="text"
                    id="estimatedDuration"
                    name="estimatedDuration"
                    value={formData.estimatedDuration}
                    onChange={handleChange}
                    placeholder="e.g., 2 weeks, 1 month"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="coverLetter">Cover Letter *</label>
                  <textarea
                    id="coverLetter"
                    name="coverLetter"
                    value={formData.coverLetter}
                    onChange={handleChange}
                    required
                    rows="8"
                    placeholder="Explain why you're the best fit for this project. Mention your experience, approach, and any relevant past work..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="portfolioLinks">Portfolio Links (one per line)</label>
                  <textarea
                    id="portfolioLinks"
                    name="portfolioLinks"
                    value={formData.portfolioLinks}
                    onChange={handleChange}
                    rows="4"
                    placeholder="https://your-portfolio.com&#10;https://github.com/yourusername&#10;https://dribbble.com/yourusername"
                  />
                  <small>Enter each link on a new line</small>
                </div>

                <div className="form-group">
                  <label htmlFor="files">Attachments (PDF, DOC, Images)</label>
                  <input
                    type="file"
                    id="files"
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <small>Max 5 files, 5MB each. Supported: PDF, DOC, DOCX, JPG, PNG</small>
                </div>

                {files.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>Selected files:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {files.map((file, index) => (
                        <li key={index}>{file.name} ({(file.size / 1024).toFixed(2)} KB)</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setShowApplyForm(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={submitting}
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .notification-banner {
          background-color: #10b981;
          color: white;
          padding: 12px 24px;
          text-align: center;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default ProjectDetails;
