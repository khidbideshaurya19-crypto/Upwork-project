import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState({});

  useEffect(() => {
    fetchMyProjects();
  }, []);

  const fetchMyProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects/my-projects');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#10b981',
      'in-progress': '#3b82f6',
      completed: '#8b5cf6',
      closed: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderProjectCard = (project) => (
    <div key={project._id} className="upw-job-card" onClick={() => navigate(`/project/${project._id}`)}>
      <div className="upw-job-top-row">
        <span className="upw-posted">Posted {new Date(project.createdAt).toLocaleDateString()}</span>
        <span className="status-badge" style={{ backgroundColor: getStatusColor(project.status) }}>
          {project.status}
        </span>
      </div>

      <h3 className="upw-job-title">{project.title}</h3>

      <p className="upw-job-meta">
        {project.budgetType === 'fixed' ? 'Fixed-price' : 'Hourly'} · {project.category} · Budget: ${project.budget}
      </p>

      <p className="upw-job-desc">{project.description.length > 280 ? project.description.substring(0, 280) + '...' : project.description}</p>

      {project.skills && project.skills.length > 0 && (
        <div className="upw-skill-tags">
          {project.skills.slice(0, 5).map((skill, index) => (
            <span key={index} className="upw-skill-pill">{skill}</span>
          ))}
        </div>
      )}

      <div className="upw-job-bottom">
        <span className="upw-meta-light">👥 {project.applicantsCount || 0} applicants</span>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="upw-page-title">
          <h1>My Projects</h1>
        </div>

        <div className="upw-layout">
          <div className="upw-feed">
            {loading ? (
              <div className="loading">Loading projects...</div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <p>You haven't posted any projects yet.</p>
                <button className="btn-primary" onClick={() => navigate('/post-project')}>
                  Post Your First Project
                </button>
              </div>
            ) : (
              projects.map((project) => renderProjectCard(project))
            )}
          </div>

          <aside className="upw-sidebar">
            <div className="upw-side-card">
              <div className="upw-side-header" onClick={() => toggleSection('profile')}>
                <h3>Profile completeness</h3>
                <span className={`upw-chevron ${collapsedSections.profile ? 'collapsed' : ''}`}>▲</span>
              </div>
              {!collapsedSections.profile && (
                <div className="upw-side-body">
                  <p>Increase your profile visibility in search results and attract more proposals.</p>
                  <button className="upw-blue-link" onClick={() => navigate('/profile')}>Complete your profile</button>
                </div>
              )}
            </div>

            <div className="upw-side-card">
              <div className="upw-side-header" onClick={() => toggleSection('promote')}>
                <h3>Promote with ads</h3>
                <span className={`upw-chevron ${collapsedSections.promote ? 'collapsed' : ''}`}>▲</span>
              </div>
              {!collapsedSections.promote && (
                <div className="upw-side-body">
                  <div className="upw-promo-row">
                    <div>
                      <span className="upw-promo-label">Featured projects</span>
                      <span className="upw-promo-value">Off</span>
                    </div>
                    <span className="upw-promo-edit">✏️</span>
                  </div>
                  <div className="upw-promo-row">
                    <div>
                      <span className="upw-promo-label">Boost visibility</span>
                      <span className="upw-promo-value">Off</span>
                    </div>
                    <span className="upw-promo-edit">✏️</span>
                  </div>
                </div>
              )}
            </div>

            <div className="upw-side-card">
              <div className="upw-side-header" onClick={() => toggleSection('projects')}>
                <h3>Active Projects: {projects.filter(p => p.status !== 'closed').length}</h3>
                <span className={`upw-chevron ${collapsedSections.projects ? 'collapsed' : ''}`}>▲</span>
              </div>
              {!collapsedSections.projects && (
                <div className="upw-side-body">
                  <button className="upw-blue-btn" onClick={() => navigate('/post-project')}>Post New Project</button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
