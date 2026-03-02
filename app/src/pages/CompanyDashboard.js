import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { io } from 'socket.io-client';
import './Dashboard.css';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'browse');
  const [browseTab, setBrowseTab] = useState('best');
  const [savedJobs, setSavedJobs] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [applyModal, setApplyModal] = useState(null); // project object
  const [applyForm, setApplyForm] = useState({ quotation: '', coverLetter: '', estimatedDuration: '' });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Refresh user profile data once on mount
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchMyApplications();
    
    const socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('Connected to Socket.IO');
      socket.emit('join', { userId: user?.id, role: 'company' });
      socket.emit('subscribeToProjects');
    });

    socket.on('newProject', (project) => {
      setNotification(`New project posted: ${project.title}`);
      fetchProjects();
      setTimeout(() => setNotification(null), 5000);
    });

    socket.on('applicationStatusUpdate', (data) => {
      setNotification(`Application ${data.status} for "${data.projectTitle}"`);
      fetchMyApplications();
      setTimeout(() => setNotification(null), 5000);
    });

    return () => socket.disconnect();
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await api.get('/projects?status=open');
      setProjects(response.data.projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const response = await api.get('/applications/my-applications');
      setMyApplications(response.data.applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#10b981',
      pending: '#f59e0b',
      accepted: '#10b981',
      rejected: '#ef4444'
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
          companyId: user.id,
          applicationId: app._id
        });
        navigate(`/messages/${response.data.conversation._id}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert(error.response?.data?.message || 'Failed to start chat. Please try again.');
    }
  };

  const handleStartChatFromProject = async (project, e) => {
    e.stopPropagation();
    
    console.log('Starting chat from project:', project._id);
    console.log('Current user:', user);
    
    try {
      // First check if conversation exists
      const convResponse = await api.get('/messages/conversations');
      console.log('Existing conversations:', convResponse.data.conversations);
      
      const existingConv = convResponse.data.conversations.find(
        conv => conv.project._id === project._id
      );
      
      if (existingConv) {
        console.log('Found existing conversation:', existingConv._id);
        navigate(`/messages/${existingConv._id}`);
        return;
      }
      
      // Create new conversation
      console.log('Creating new conversation for project:', project._id);
      const response = await api.post('/messages/start', {
        projectId: project._id,
        companyId: user.id
      });
      
      console.log('Conversation created:', response.data.conversation._id);
      navigate(`/messages/${response.data.conversation._id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to start chat. Please try again.');
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getPostedLabel = (date) => {
    const posted = parseDate(date);
    if (!posted) return 'Posted recently';
    
    const now = new Date();
    const diffMs = now - posted;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Posted today';
    if (diffDays === 1) return 'Posted yesterday';
    return `Posted ${diffDays} days ago`;
  };

  const toggleSaved = (projectId, e) => {
    e.stopPropagation();
    setSavedJobs(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const openApplyModal = (project, e) => {
    e.stopPropagation();
    setApplyForm({ quotation: '', coverLetter: '', estimatedDuration: '' });
    setApplyError('');
    setApplyModal(project);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.quotation || !applyForm.coverLetter) {
      setApplyError('Quotation and cover letter are required.');
      return;
    }
    setApplyLoading(true);
    setApplyError('');
    try {
      await api.post(`/applications/${applyModal._id}`, {
        quotation: Number(applyForm.quotation),
        coverLetter: applyForm.coverLetter,
        estimatedDuration: applyForm.estimatedDuration
      });
      setApplyModal(null);
      fetchMyApplications();
      fetchProjects();
      setNotification(`Proposal submitted for "${applyModal.title}"!`);
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setApplyError(err.response?.data?.message || 'Failed to submit proposal.');
    } finally {
      setApplyLoading(false);
    }
  };

  const hasApplied = (projectId) =>
    myApplications.some(app => app.project?._id === projectId || app.project === projectId);

  // ── Best Match scoring algorithm ──
  const computeMatchScore = (project) => {
    let score = 0;
    const userSkills = (user?.skills || []).map(s => s.toLowerCase().trim());
    const projectSkills = (project.skills || []).map(s => s.toLowerCase().trim());

    // 1. Skill overlap (0-50 pts) — biggest factor
    if (userSkills.length > 0 && projectSkills.length > 0) {
      const matched = projectSkills.filter(ps => userSkills.some(us =>
        us === ps || us.includes(ps) || ps.includes(us)
      ));
      const overlapRatio = matched.length / projectSkills.length;
      score += Math.round(overlapRatio * 50);
    }

    // 2. Industry / category match (0-15 pts)
    const userIndustry = (user?.industry || '').toLowerCase();
    const userBio = (user?.bio || '').toLowerCase();
    const userDesc = (user?.description || '').toLowerCase();
    const projCategory = (project.category || '').toLowerCase();
    const projTitle = (project.title || '').toLowerCase();
    const projDesc = (project.description || '').toLowerCase();

    if (userIndustry && (projCategory.includes(userIndustry) || userIndustry.includes(projCategory))) {
      score += 15;
    } else if (userIndustry && (projTitle.includes(userIndustry) || projDesc.includes(userIndustry))) {
      score += 8;
    }

    // 3. Bio/description keyword relevance (0-10 pts)
    if (userBio || userDesc) {
      const profileWords = (userBio + ' ' + userDesc)
        .split(/[\s,;.]+/)
        .filter(w => w.length > 3)
        .map(w => w.toLowerCase());
      const uniqueWords = [...new Set(profileWords)];
      const projText = projTitle + ' ' + projDesc + ' ' + projCategory;
      const hits = uniqueWords.filter(w => projText.includes(w)).length;
      score += Math.min(10, Math.round((hits / Math.max(uniqueWords.length, 1)) * 10));
    }

    // 4. Recency bonus (0-15 pts) — newer projects score higher
    const ageMs = Date.now() - new Date(project.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 1) score += 15;
    else if (ageDays < 3) score += 12;
    else if (ageDays < 7) score += 8;
    else if (ageDays < 14) score += 4;
    else if (ageDays < 30) score += 2;

    // 5. Low competition bonus (0-10 pts) — fewer applicants = better chance
    const applicants = project.applicantsCount || 0;
    if (applicants === 0) score += 10;
    else if (applicants <= 3) score += 7;
    else if (applicants <= 10) score += 3;

    return score;
  };

  const displayProjects = [...projects].sort((a, b) => {
    if (browseTab === 'recent') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // Best Matches — score descending, tie-break by recency
    const scoreA = computeMatchScore(a);
    const scoreB = computeMatchScore(b);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const renderJobCard = (project) => {
    const matchScore = browseTab === 'best' ? computeMatchScore(project) : null;
    return (
    <div key={project._id} className="upw-job-card">
      <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${project._id}`)}>
        <div className="upw-job-top-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="upw-posted">{getPostedLabel(project.createdAt)}</span>
            {matchScore !== null && matchScore > 0 && (
              <span className={`upw-match-badge ${matchScore >= 50 ? 'high' : matchScore >= 25 ? 'medium' : 'low'}`}>
                {matchScore}% match
              </span>
            )}
          </div>
          <div className="upw-job-actions">
            <button
              className={`upw-icon-btn ${savedJobs.includes(project._id) ? 'saved' : ''}`}
              title={savedJobs.includes(project._id) ? 'Unsave job' : 'Save job'}
              onClick={(e) => toggleSaved(project._id, e)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={savedJobs.includes(project._id) ? '#0d6efd' : 'none'} stroke={savedJobs.includes(project._id) ? '#0d6efd' : '#6b7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </div>

        <h3 className="upw-job-title">{project.title}</h3>

        <p className="upw-job-meta">
          {project.budgetType === 'fixed' ? 'Fixed-price' : 'Hourly'} · {project.category} · Est. Budget: ${project.budget}
        </p>

        <p className="upw-job-desc">{project.description.length > 150 ? project.description.substring(0, 150) + '...' : project.description}</p>

        {project.skills && project.skills.length > 0 && (
          <div className="upw-skill-tags">
            {project.skills.slice(0, 5).map((skill, index) => (
              <span key={index} className="upw-skill-pill">{skill}</span>
            ))}
            {project.skills.length > 5 && (
              <span className="upw-skill-more">+{project.skills.length - 5} more</span>
            )}
          </div>
        )}

        <div className="upw-job-bottom">
          <span className="upw-verified">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#0d6efd" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none"/></svg>
            Payment verified
          </span>
          <span className="upw-stars">★★★★★</span>
          <span className="upw-meta-light">📍 {project.location || 'Remote'}</span>
        </div>

        <p className="upw-proposals">Proposals: {project.applicantsCount || 0}</p>
      </div>
      
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }}>
        {hasApplied(project._id) ? (
          <button
            className="btn-primary"
            style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#6b7280', cursor: 'default' }}
            disabled
          >
            ✓ Proposal Submitted
          </button>
        ) : (
          <button
            className="btn-primary"
            style={{ flex: 1, padding: '8px', fontSize: '13px', background: '#10b981' }}
            onClick={(e) => openApplyModal(project, e)}
          >
            📝 Submit Proposal
          </button>
        )}
        <button
          className="btn-primary"
            style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          onClick={(e) => handleStartChatFromProject(project, e)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          Chat
        </button>
      </div>
    </div>
  );
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      {notification && (
        <div className="notification-banner">
          🔔 {notification}
        </div>
      )}

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`} 
          onClick={() => setActiveTab('browse')}
        >
          Browse Projects
        </button>
        <button 
          className={`tab-btn ${activeTab === 'applications' ? 'active' : ''}`} 
          onClick={() => setActiveTab('applications')}
        >
          My Applications
        </button>
      </div>

      <div className="dashboard-content">

        {activeTab === 'browse' && (
          <>
            <div className="upw-page-title">
              <h1>Jobs you might like</h1>
            </div>

            <div className="upw-tabs-row">
              <div className="upw-tabs-left">
                <button className={`upw-tab ${browseTab === 'best' ? 'active' : ''}`} onClick={() => setBrowseTab('best')}>Best Matches</button>
                <button className={`upw-tab ${browseTab === 'recent' ? 'active' : ''}`} onClick={() => setBrowseTab('recent')}>Most Recent</button>
                <button className={`upw-tab ${browseTab === 'saved' ? 'active' : ''}`} onClick={() => setBrowseTab('saved')}>Saved Jobs</button>
              </div>
              <button className="upw-filters-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
                Filters
              </button>
            </div>

            <p className="upw-browse-desc">Browse jobs that match your experience to a client's hiring preferences. Ordered by most relevant.</p>

            <div className="upw-layout">
              <div className="upw-feed">
                {loading ? (
                  <div className="loading">Loading projects...</div>
                ) : browseTab === 'saved' ? (
                  savedJobs.length === 0 ? (
                    <div className="empty-state"><p>No saved jobs yet. Click the heart icon to save jobs.</p></div>
                  ) : (
                    displayProjects
                      .filter(p => savedJobs.includes(p._id))
                      .map((project) => renderJobCard(project))
                  )
                ) : displayProjects.length === 0 ? (
                  <div className="empty-state"><p>No projects available at the moment.</p></div>
                ) : (
                  displayProjects.map((project) => renderJobCard(project))
                )}
              </div>

              <aside className="upw-sidebar">
                <div className="upw-side-card upw-profile-card">
                  <div className="upw-side-header" onClick={() => toggleSection('profile')}>
                    <h3>My Profile</h3>
                    <span className={`upw-chevron ${collapsedSections.profile ? 'collapsed' : ''}`}>&#9650;</span>
                  </div>
                  {!collapsedSections.profile && (
                    <div className="upw-side-body upw-profile-body">
                      <div className="upw-profile-avatar">
                        {user?.profileImage ? (
                          <img
                            src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`}
                            alt="Profile"
                            className="upw-profile-img"
                          />
                        ) : (
                          <div className="upw-profile-initials">
                            {(user?.companyName || user?.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <h4 className="upw-profile-name">{user?.companyName || user?.name || 'User'}</h4>
                      {(user?.bio || user?.description) && (
                        <p className="upw-profile-bio">
                          {(user.bio || user.description).length > 120
                            ? (user.bio || user.description).substring(0, 120) + '...'
                            : (user.bio || user.description)}
                        </p>
                      )}
                      <button className="upw-green-link" onClick={() => navigate('/profile')}>Edit Profile</button>
                    </div>
                  )}
                </div>

                <div className="upw-side-card">
                  <div className="upw-side-header" onClick={() => toggleSection('connects')}>
                    <h3>Connects: {myApplications.length}</h3>
                    <span className={`upw-chevron ${collapsedSections.connects ? 'collapsed' : ''}`}>&#9650;</span>
                  </div>
                  {!collapsedSections.connects && (
                    <div className="upw-side-body">
                      <button className="upw-connects-btn" onClick={() => navigate('/profile')}>View Profile</button>
                      <button className="upw-view-details" onClick={() => setActiveTab('applications')}>View details</button>
                    </div>
                  )}
                </div>

                <div className="upw-side-card upw-side-card--compact">
                  <div className="upw-side-header" onClick={() => toggleSection('proposals')}>
                    <h3>Proposals</h3>
                    <span className={`upw-chevron ${collapsedSections.proposals ? 'collapsed' : ''}`}>&#9660;</span>
                  </div>
                  {collapsedSections.proposals && (
                    <div className="upw-side-body">
                      <p>You have <strong>{myApplications.length}</strong> active proposals.</p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}

        {activeTab === 'applications' && (
          <>
            <div className="dashboard-header">
              <h1>My Applications</h1>
              <p style={{ color: '#6b7280' }}>{myApplications.length} applications submitted</p>
            </div>

            {myApplications.length === 0 ? (
              <div className="empty-state">
                <p>You haven't applied to any projects yet.</p>
                <button className="btn-primary" onClick={() => setActiveTab('browse')}>
                  Browse Projects
                </button>
              </div>
            ) : (
              <div className="projects-grid">
                {myApplications.map((app) => (
                  <div key={app._id} className="project-card">
                    <div className="project-header">
                      <h3>{app.project.title}</h3>
                      <span className="status-badge" style={{ backgroundColor: getStatusColor(app.status) }}>
                        {app.status}
                      </span>
                    </div>
                    
                    <p className="project-description">{app.project.description.substring(0, 150)}...</p>
                    
                    <div className="project-meta">
                      <div className="meta-item">
                        <strong>Your Quotation:</strong> ${app.quotation}
                      </div>
                      <div className="meta-item">
                        <strong>Project Budget:</strong> ${app.project.budget}
                      </div>
                    </div>

                    <div className="project-footer">
                      <span className="project-date">Applied {parseDate(app.createdAt)?.toLocaleDateString() || 'recently'}</span>
                      {app.status !== 'rejected' && (
                        <button 
                          className="btn-primary" 
                          style={{ padding: '8px 16px', fontSize: '14px' }}
                          onClick={() => handleStartChat(app)}
                        >
                          💬 Chat with Client
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Apply / Quote Modal */}
      {applyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', color: '#111' }}>Submit Proposal</h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>{applyModal.title}</p>
              </div>
              <button onClick={() => setApplyModal(null)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#166534' }}>
              <strong>Client's Budget:</strong> ${applyModal.budget} · {applyModal.budgetType === 'fixed' ? 'Fixed Price' : 'Hourly'}
            </div>

            {applyError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                  Your Quote / Bid ($) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter your price"
                  value={applyForm.quotation}
                  onChange={e => setApplyForm(f => ({ ...f, quotation: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                  Estimated Duration
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 weeks, 1 month"
                  value={applyForm.estimatedDuration}
                  onChange={e => setApplyForm(f => ({ ...f, estimatedDuration: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '14px' }}>
                  Cover Letter <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={5}
                  placeholder="Introduce yourself and explain why you're the best fit for this project..."
                  value={applyForm.coverLetter}
                  onChange={e => setApplyForm(f => ({ ...f, coverLetter: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setApplyModal(null)}
                  style={{ flex: 1, padding: '12px', border: '1px solid #d1d5db', background: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  style={{ flex: 2, padding: '12px', background: applyLoading ? '#6b7280' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: applyLoading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '600' }}
                >
                  {applyLoading ? 'Submitting...' : '📝 Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
