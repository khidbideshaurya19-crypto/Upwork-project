import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { io } from 'socket.io-client';
import './Dashboard.css';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'browse');
  const [browseTab, setBrowseTab] = useState('best');
  const [savedJobs, setSavedJobs] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    timeframe: '',
    industry: ''
  });

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

  const getPostedLabel = (date) => {
    const now = new Date();
    const posted = new Date(date);
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

  const applyFilters = (projectsList) => {
    let filtered = [...projectsList];

    // Time filter
    if (filters.timeframe) {
      const now = new Date();
      filtered = filtered.filter(project => {
        const postedDate = new Date(project.createdAt);
        const diffMs = now - postedDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        switch (filters.timeframe) {
          case '24hr':
            return diffHours <= 24;
          case '3days':
            return diffDays <= 3;
          case '7days':
            return diffDays <= 7;
          case '30days':
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Industry filter
    if (filters.industry) {
      filtered = filtered.filter(project => 
        project.category?.toLowerCase().includes(filters.industry.toLowerCase()) ||
        project.industry?.toLowerCase().includes(filters.industry.toLowerCase())
      );
    }

    return filtered;
  };

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: prev[type] === value ? '' : value
    }));
  };

  const clearFilters = () => {
    setFilters({
      timeframe: '',
      industry: ''
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  const displayProjects = applyFilters([...projects]).sort((a, b) => {
    if (browseTab === 'recent') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return (b.skills?.length || 0) - (a.skills?.length || 0);
  });

  const renderJobCard = (project) => (
    <div key={project._id} className="upw-job-card">
      <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/project/${project._id}`)}>
        <div className="upw-job-top-row">
          <span className="upw-posted">{getPostedLabel(project.createdAt)}</span>
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

        <p className="upw-job-desc">{project.description.length > 280 ? project.description.substring(0, 280) + '...' : project.description}</p>

        {project.skills && project.skills.length > 0 && (
          <div className="upw-skill-tags">
            {project.skills.map((skill, index) => (
              <span key={index} className="upw-skill-pill">{skill}</span>
            ))}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <p className="upw-proposals" style={{ margin: 0 }}>Proposals: {project.applicantsCount || 0}</p>
          <button 
            className="btn-primary" 
            style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'auto' }}
            onClick={(e) => handleStartChatFromProject(project, e)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat with Client
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <Navbar />

      {notification && (
        <div className="notification-banner">
          🔔 {notification}
        </div>
      )}

      <div className="dashboard-content">
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
              <button className="upw-filters-btn" onClick={() => setShowFilterModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
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
                <div className="upw-side-card">
                  <div className="upw-side-header" onClick={() => toggleSection('profile')}>
                    <h3>My Profile</h3>
                    <span className={`upw-chevron ${collapsedSections.profile ? 'collapsed' : ''}`}>&#9650;</span>
                  </div>
                  {!collapsedSections.profile && (
                    <div className="upw-side-body">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: user?.profileImage ? 'transparent' : '#0d6efd',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '32px',
                          fontWeight: '600',
                          marginBottom: '12px',
                          overflow: 'hidden',
                          border: '3px solid #e5e7eb'
                        }}>
                          {user?.profileImage ? (
                            <img 
                              src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`}
                              alt={user?.name || 'Profile'}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            user?.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', margin: '0 0 8px', textAlign: 'center' }}>
                          {user?.companyName || user?.name}
                        </h4>
                        {user?.bio && (
                          <p style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            lineHeight: '1.6',
                            textAlign: 'center',
                            margin: '0 0 12px',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {user.bio}
                          </p>
                        )}
                      </div>
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
                      <span className="project-date">Applied {new Date(app.createdAt).toLocaleDateString()}</span>
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h2>Filter Jobs</h2>
              <button className="filter-close-btn" onClick={() => setShowFilterModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="filter-modal-body">
              <div className="filter-section">
                <h3>Posted Within</h3>
                <div className="filter-options">
                  <button 
                    className={`filter-option-btn ${filters.timeframe === '24hr' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('timeframe', '24hr')}
                  >
                    Past 24 hours
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.timeframe === '3days' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('timeframe', '3days')}
                  >
                    Past 3 days
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.timeframe === '7days' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('timeframe', '7days')}
                  >
                    Past week
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.timeframe === '30days' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('timeframe', '30days')}
                  >
                    Past month
                  </button>
                </div>
              </div>

              <div className="filter-section">
                <h3>Industry</h3>
                <div className="filter-options">
                  <button 
                    className={`filter-option-btn ${filters.industry === 'marketing' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'marketing')}
                  >
                    Marketing
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'tech' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'tech')}
                  >
                    Tech
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'banking' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'banking')}
                  >
                    Banking
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'accounting' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'accounting')}
                  >
                    Accounting
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'design' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'design')}
                  >
                    Design
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'writing' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'writing')}
                  >
                    Writing
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'consulting' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'consulting')}
                  >
                    Consulting
                  </button>
                  <button 
                    className={`filter-option-btn ${filters.industry === 'healthcare' ? 'active' : ''}`}
                    onClick={() => handleFilterChange('industry', 'healthcare')}
                  >
                    Healthcare
                  </button>
                </div>
              </div>
            </div>

            <div className="filter-modal-footer">
              <button className="filter-clear-btn" onClick={clearFilters}>
                Clear All
              </button>
              <button className="filter-apply-btn" onClick={() => setShowFilterModal(false)}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyDashboard;
