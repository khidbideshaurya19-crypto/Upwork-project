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
  const [editProject, setEditProject] = useState(null); // project being edited
  const [editForm, setEditForm] = useState(null); // form state for editing
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

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

  const renderProjectCard = (project) => {
    const canEdit = project.status === 'open';
    const canDelete = project.status === 'open' || project.status === 'closed';
    return (
      <div key={project._id} className="upw-job-card">
        <div className="upw-job-top-row" onClick={() => navigate(`/project/${project._id}`)}>
          <span className="upw-posted">Posted {parseDate(project.createdAt)?.toLocaleDateString() || 'recently'}</span>
          <span className="status-badge" style={{ backgroundColor: getStatusColor(project.status) }}>
            {project.status}
          </span>
        </div>

        <h3 className="upw-job-title" onClick={() => navigate(`/project/${project._id}`)}>{project.title}</h3>

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
          <div style={{ float: 'right' }}>
            {canEdit && (
              <button className="upw-blue-btn" style={{ marginRight: 8 }} onClick={() => handleEditClick(project)}>
                Edit
              </button>
            )}
            {canDelete && (
              <button className="upw-red-btn" onClick={() => handleDeleteClick(project)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Edit logic
  const handleEditClick = (project) => {
    setEditProject(project);
    setEditForm({
      title: project.title,
      description: project.description,
      category: project.category,
      budget: project.budget,
      budgetType: project.budgetType,
      duration: project.duration,
      skills: project.skills || [],
      status: project.status
    });
    setEditError('');
  };

  const handleEditFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSkillRemove = (skill) => {
    setEditForm({ ...editForm, skills: editForm.skills.filter(s => s !== skill) });
  };

  const handleEditSkillAdd = (e) => {
    const skill = e.target.value.trim();
    if (skill && !editForm.skills.includes(skill)) {
      setEditForm({ ...editForm, skills: [...editForm.skills, skill] });
    }
    e.target.value = '';
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const payload = {
        ...editForm,
        budget: parseFloat(editForm.budget),
        skills: editForm.skills
      };
      await api.put(`/projects/${editProject._id}`, payload);
      setEditProject(null);
      fetchMyProjects();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditClose = () => {
    setEditProject(null);
  };

  // Delete logic
  const handleDeleteClick = async (project) => {
    if (!window.confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${project._id}`);
      fetchMyProjects();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="upw-page-title">
          <h1>My Projects</h1>
        </div>

        {editProject && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Edit Project</h2>
              {editError && <div className="error-message">{editError}</div>}
              <form onSubmit={handleEditSubmit} className="project-form">
                <div className="form-group">
                  <label>Title</label>
                  <input name="title" value={editForm.title} onChange={handleEditFormChange} required disabled={editLoading} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={editForm.description} onChange={handleEditFormChange} required disabled={editLoading} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input name="category" value={editForm.category} onChange={handleEditFormChange} required disabled={editLoading} />
                </div>
                <div className="form-group">
                  <label>Budget</label>
                  <input name="budget" type="number" value={editForm.budget} onChange={handleEditFormChange} required disabled={editLoading} />
                </div>
                <div className="form-group">
                  <label>Budget Type</label>
                  <select name="budgetType" value={editForm.budgetType} onChange={handleEditFormChange} disabled={editLoading}>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input name="duration" value={editForm.duration} onChange={handleEditFormChange} disabled={editLoading} />
                </div>
                <div className="form-group">
                  <label>Skills</label>
                  <div>
                    {editForm.skills.map((skill, idx) => (
                      <span key={idx} className="upw-skill-pill" style={{ marginRight: 4 }}>
                        {skill} <span style={{ cursor: 'pointer', color: 'red' }} onClick={() => handleEditSkillRemove(skill)}>×</span>
                      </span>
                    ))}
                  </div>
                  <input type="text" placeholder="Add skill and press Enter" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEditSkillAdd(e); }}} disabled={editLoading} />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select name="status" value={editForm.status} onChange={handleEditFormChange} disabled={editLoading}>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div style={{ marginTop: 16 }}>
                  <button className="upw-blue-btn" type="submit" disabled={editLoading}>Save</button>
                  <button className="upw-red-btn" type="button" onClick={handleEditClose} style={{ marginLeft: 8 }} disabled={editLoading}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

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
