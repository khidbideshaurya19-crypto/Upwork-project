import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './ProjectWorkspace.css';

const ProjectWorkspace = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [contract, setContract] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Milestone form
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', amount: '', dueDate: '' });

  // Update form
  const [updateText, setUpdateText] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);
  const [updateFiles, setUpdateFiles] = useState([]);

  // Milestone action
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Milestone deliverable uploads (keyed by milestoneId)
  const [milestoneFiles, setMilestoneFiles] = useState({});

  const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const getFileIcon = (mimetype) => {
    if (!mimetype) return '📄';
    if (mimetype.startsWith('image/')) return '🖼️';
    if (mimetype.startsWith('video/')) return '🎬';
    if (mimetype.startsWith('audio/')) return '🎵';
    if (mimetype.includes('pdf')) return '📕';
    if (mimetype.includes('zip') || mimetype.includes('rar')) return '📦';
    if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return '📊';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '📽️';
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isClient = user?.role === 'client';
  const isCompany = user?.role === 'company';

  const parseDate = (d) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString();
  };

  const timeAgo = (d) => {
    if (!d) return '';
    const now = Date.now();
    const diff = now - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return parseDate(d);
  };

  const fetchContract = useCallback(async () => {
    try {
      setLoading(true);
      const [contractRes, milestonesRes, updatesRes] = await Promise.all([
        api.get(`/contracts/${contractId}`),
        api.get(`/contracts/${contractId}/milestones`),
        api.get(`/contracts/${contractId}/updates`)
      ]);
      setContract(contractRes.data.contract);
      setMilestones(milestonesRes.data.milestones);
      setUpdates(updatesRes.data.updates);
    } catch (err) {
      console.error('Fetch workspace error:', err);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  // ── Milestone actions ──
  const handleAddMilestone = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/contracts/${contractId}/milestones`, milestoneForm);
      setMilestoneForm({ title: '', description: '', amount: '', dueDate: '' });
      setShowMilestoneForm(false);
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add milestone');
    }
  };

  const handleMilestoneAction = async (milestoneId, status, feedback) => {
    try {
      setActionLoading(true);
      const files = milestoneFiles[milestoneId] || [];
      // Use FormData when submitting deliverables with files
      if ((status === 'submitted') && files.length > 0) {
        const formData = new FormData();
        formData.append('status', status);
        if (feedback) formData.append('feedback', feedback);
        files.forEach(f => formData.append('deliverables', f));
        await api.put(`/contracts/${contractId}/milestones/${milestoneId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        // Clear files after upload
        setMilestoneFiles(prev => ({ ...prev, [milestoneId]: [] }));
      } else {
        await api.put(`/contracts/${contractId}/milestones/${milestoneId}`, { status, feedback });
      }
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setFeedbackModal(null);
      setFeedbackText('');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await api.delete(`/contracts/${contractId}/milestones/${milestoneId}`);
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  // ── Post update ──
  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) return;
    try {
      setPostingUpdate(true);
      if (updateFiles.length > 0) {
        const formData = new FormData();
        formData.append('message', updateText);
        updateFiles.forEach(f => formData.append('attachments', f));
        await api.post(`/contracts/${contractId}/updates`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post(`/contracts/${contractId}/updates`, { message: updateText });
      }
      setUpdateText('');
      setUpdateFiles([]);
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post update');
    } finally {
      setPostingUpdate(false);
    }
  };

  // ── Complete project ──
  const handleCompleteProject = async () => {
    if (!window.confirm('Mark this project as completed? This cannot be undone.')) return;
    try {
      await api.put(`/contracts/${contractId}/complete`);
      fetchContract();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete');
    }
  };

  const getMilestoneStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#6b7280';
      case 'in-progress': return '#3b82f6';
      case 'submitted': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'revision-requested': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getMilestoneStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in-progress': return 'In Progress';
      case 'submitted': return 'Submitted for Review';
      case 'approved': return '✓ Approved';
      case 'revision-requested': return 'Revision Requested';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="ws-loading">Loading workspace...</div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="dashboard-container">
        <Navbar />
        <div className="ws-loading">Contract not found.</div>
      </div>
    );
  }

  const completedMilestones = milestones.filter(m => m.status === 'approved').length;
  const totalMilestones = milestones.length;
  const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="ws-container">
        {/* Header */}
        <div className="ws-header">
          <div className="ws-header-left">
            <button className="ws-back-btn" onClick={() => navigate(-1)}>← Back</button>
            <div>
              <h1 className="ws-title">{contract.project?.title || 'Project Workspace'}</h1>
              <p className="ws-subtitle">
                {isClient ? `Company: ${contract.company?.companyName || contract.company?.name}` :
                            `Client: ${contract.client?.name}`}
                <span className={`ws-status-badge ws-status-${contract.status}`}>
                  {contract.status === 'active' ? '● Active' : '✓ Completed'}
                </span>
              </p>
            </div>
          </div>
          {isClient && contract.status === 'active' && (
            <button className="ws-complete-btn" onClick={handleCompleteProject}>
              ✓ Mark Complete
            </button>
          )}
        </div>

        {/* Progress bar */}
        {totalMilestones > 0 && (
          <div className="ws-progress-section">
            <div className="ws-progress-header">
              <span>Project Progress</span>
              <span>{completedMilestones}/{totalMilestones} milestones · {progressPercent}%</span>
            </div>
            <div className="ws-progress-bar">
              <div className="ws-progress-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="ws-tabs">
          {['overview', 'milestones', 'updates'].map(tab => (
            <button
              key={tab}
              className={`ws-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'overview' ? '📋 Overview' : tab === 'milestones' ? '🎯 Milestones' : '📢 Updates'}
              {tab === 'milestones' && totalMilestones > 0 && (
                <span className="ws-tab-count">{totalMilestones}</span>
              )}
              {tab === 'updates' && updates.length > 0 && (
                <span className="ws-tab-count">{updates.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ═══ Overview Tab ═══ */}
        {activeTab === 'overview' && (
          <div className="ws-content">
            <div className="ws-overview-grid">
              {/* Contract details */}
              <div className="ws-card">
                <h3 className="ws-card-title">Contract Details</h3>
                <div className="ws-detail-rows">
                  <div className="ws-detail-row">
                    <span className="ws-detail-label">Budget</span>
                    <span className="ws-detail-value">${contract.agreedBudget} ({contract.budgetType})</span>
                  </div>
                  <div className="ws-detail-row">
                    <span className="ws-detail-label">Timeline</span>
                    <span className="ws-detail-value">{contract.timeline || 'Not specified'}</span>
                  </div>
                  <div className="ws-detail-row">
                    <span className="ws-detail-label">Start Date</span>
                    <span className="ws-detail-value">{parseDate(contract.startDate)}</span>
                  </div>
                  <div className="ws-detail-row">
                    <span className="ws-detail-label">Status</span>
                    <span className="ws-detail-value" style={{ textTransform: 'capitalize' }}>{contract.status}</span>
                  </div>
                  {contract.completedAt && (
                    <div className="ws-detail-row">
                      <span className="ws-detail-label">Completed</span>
                      <span className="ws-detail-value">{parseDate(contract.completedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Project info */}
              <div className="ws-card">
                <h3 className="ws-card-title">Project Info</h3>
                <p className="ws-project-desc">{contract.project?.description}</p>
                {contract.project?.skills && contract.project.skills.length > 0 && (
                  <div className="ws-skills">
                    {contract.project.skills.map((s, i) => (
                      <span key={i} className="ws-skill-tag">{s}</span>
                    ))}
                  </div>
                )}
                <div className="ws-detail-row" style={{ marginTop: '12px' }}>
                  <span className="ws-detail-label">Category</span>
                  <span className="ws-detail-value">{contract.project?.category}</span>
                </div>
              </div>

              {/* People */}
              <div className="ws-card">
                <h3 className="ws-card-title">People</h3>
                <div className="ws-person">
                  <div className="ws-person-avatar">{contract.client?.name?.charAt(0) || 'C'}</div>
                  <div>
                    <div className="ws-person-name">{contract.client?.name}</div>
                    <div className="ws-person-role">Client</div>
                  </div>
                </div>
                <div className="ws-person">
                  <div className="ws-person-avatar ws-person-avatar-company">
                    {(contract.company?.companyName || contract.company?.name || 'C').charAt(0)}
                  </div>
                  <div>
                    <div className="ws-person-name">{contract.company?.companyName || contract.company?.name}</div>
                    <div className="ws-person-role">Company</div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="ws-card">
                <h3 className="ws-card-title">Quick Stats</h3>
                <div className="ws-stats-grid">
                  <div className="ws-stat">
                    <div className="ws-stat-value">{totalMilestones}</div>
                    <div className="ws-stat-label">Milestones</div>
                  </div>
                  <div className="ws-stat">
                    <div className="ws-stat-value">{completedMilestones}</div>
                    <div className="ws-stat-label">Completed</div>
                  </div>
                  <div className="ws-stat">
                    <div className="ws-stat-value">{updates.length}</div>
                    <div className="ws-stat-label">Updates</div>
                  </div>
                  <div className="ws-stat">
                    <div className="ws-stat-value">{progressPercent}%</div>
                    <div className="ws-stat-label">Progress</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Milestones Tab ═══ */}
        {activeTab === 'milestones' && (
          <div className="ws-content">
            {contract.status === 'active' && (
              <div className="ws-section-header">
                <h3>Milestones</h3>
                <button className="ws-add-btn" onClick={() => setShowMilestoneForm(!showMilestoneForm)}>
                  {showMilestoneForm ? '✕ Cancel' : '+ Add Milestone'}
                </button>
              </div>
            )}

            {showMilestoneForm && (
              <form className="ws-milestone-form" onSubmit={handleAddMilestone}>
                <div className="ws-form-row">
                  <input
                    type="text"
                    placeholder="Milestone title *"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                    required
                    className="ws-input"
                  />
                  <input
                    type="number"
                    placeholder="Amount ($)"
                    value={milestoneForm.amount}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                    className="ws-input ws-input-sm"
                  />
                </div>
                <textarea
                  placeholder="Description (optional)"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="ws-textarea"
                  rows={2}
                />
                <div className="ws-form-row">
                  <input
                    type="date"
                    value={milestoneForm.dueDate}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
                    className="ws-input ws-input-sm"
                  />
                  <button type="submit" className="ws-submit-btn">Add Milestone</button>
                </div>
              </form>
            )}

            {milestones.length === 0 ? (
              <div className="ws-empty">
                <p>No milestones yet. Add milestones to track project progress.</p>
              </div>
            ) : (
              <div className="ws-milestone-list">
                {milestones.map((m, idx) => (
                  <div key={m._id} className={`ws-milestone-card ws-ms-${m.status}`}>
                    <div className="ws-ms-header">
                      <div className="ws-ms-order">{idx + 1}</div>
                      <div className="ws-ms-info">
                        <h4 className="ws-ms-title">{m.title}</h4>
                        {m.description && <p className="ws-ms-desc">{m.description}</p>}
                      </div>
                      <div className="ws-ms-right">
                        {m.amount > 0 && <span className="ws-ms-amount">${m.amount}</span>}
                        <span className="ws-ms-status" style={{ backgroundColor: getMilestoneStatusColor(m.status) }}>
                          {getMilestoneStatusLabel(m.status)}
                        </span>
                      </div>
                    </div>

                    {m.dueDate && (
                      <div className="ws-ms-meta">Due: {parseDate(m.dueDate)}</div>
                    )}

                    {m.feedback && (
                      <div className="ws-ms-feedback">
                        <strong>Client Feedback:</strong> {m.feedback}
                      </div>
                    )}

                    {/* Deliverable Attachments */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="ws-attachments">
                        <div className="ws-attachments-label">📎 Deliverables ({m.attachments.length})</div>
                        <div className="ws-attachments-list">
                          {m.attachments.map((file, fi) => (
                            <a
                              key={fi}
                              href={`${BACKEND_URL}${file.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ws-file-chip"
                              title={file.originalName}
                            >
                              <span className="ws-file-icon">{getFileIcon(file.mimetype)}</span>
                              <span className="ws-file-name">{file.originalName}</span>
                              <span className="ws-file-size">{formatFileSize(file.size)}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {contract.status === 'active' && (
                      <div className="ws-ms-actions">
                        {/* Company actions */}
                        {isCompany && m.status === 'pending' && (
                          <>
                            <button
                              className="ws-action-btn ws-btn-blue"
                              onClick={() => handleMilestoneAction(m._id, 'in-progress')}
                              disabled={actionLoading}
                            >▶ Start Work</button>
                            <button
                              className="ws-action-btn ws-btn-red"
                              onClick={() => handleDeleteMilestone(m._id)}
                            >🗑 Delete</button>
                          </>
                        )}
                        {isCompany && m.status === 'in-progress' && (
                          <div className="ws-submit-with-files">
                            <label className="ws-file-upload-btn">
                              📎 Attach Files
                              <input
                                type="file"
                                multiple
                                hidden
                                onChange={(e) => setMilestoneFiles(prev => ({
                                  ...prev,
                                  [m._id]: [...(prev[m._id] || []), ...Array.from(e.target.files)]
                                }))}
                              />
                            </label>
                            {(milestoneFiles[m._id] || []).length > 0 && (
                              <span className="ws-file-count">
                                {milestoneFiles[m._id].length} file(s) selected
                              </span>
                            )}
                            <button
                              className="ws-action-btn ws-btn-amber"
                              onClick={() => handleMilestoneAction(m._id, 'submitted')}
                              disabled={actionLoading}
                            >📤 Submit for Review</button>
                          </div>
                        )}
                        {isCompany && m.status === 'revision-requested' && (
                          <div className="ws-submit-with-files">
                            <label className="ws-file-upload-btn">
                              📎 Attach Files
                              <input
                                type="file"
                                multiple
                                hidden
                                onChange={(e) => setMilestoneFiles(prev => ({
                                  ...prev,
                                  [m._id]: [...(prev[m._id] || []), ...Array.from(e.target.files)]
                                }))}
                              />
                            </label>
                            {(milestoneFiles[m._id] || []).length > 0 && (
                              <span className="ws-file-count">
                                {milestoneFiles[m._id].length} file(s) selected
                              </span>
                            )}
                            <button
                              className="ws-action-btn ws-btn-amber"
                              onClick={() => handleMilestoneAction(m._id, 'submitted')}
                              disabled={actionLoading}
                            >📤 Resubmit</button>
                          </div>
                        )}

                        {/* Client actions */}
                        {isClient && m.status === 'submitted' && (
                          <>
                            <button
                              className="ws-action-btn ws-btn-green"
                              onClick={() => handleMilestoneAction(m._id, 'approved')}
                              disabled={actionLoading}
                            >✓ Approve</button>
                            <button
                              className="ws-action-btn ws-btn-red"
                              onClick={() => setFeedbackModal(m._id)}
                              disabled={actionLoading}
                            >↩ Request Revision</button>
                          </>
                        )}

                        {m.status === 'pending' && isClient && (
                          <button
                            className="ws-action-btn ws-btn-red"
                            onClick={() => handleDeleteMilestone(m._id)}
                          >🗑 Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Updates Tab ═══ */}
        {activeTab === 'updates' && (
          <div className="ws-content">
            {contract.status === 'active' && (
              <form className="ws-update-form" onSubmit={handlePostUpdate}>
                <textarea
                  placeholder="Post a progress update, share notes, or provide feedback..."
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  className="ws-textarea"
                  rows={3}
                />
                <div className="ws-update-form-actions">
                  <label className="ws-file-upload-btn">
                    📎 Attach Files
                    <input
                      type="file"
                      multiple
                      hidden
                      onChange={(e) => setUpdateFiles(prev => [...prev, ...Array.from(e.target.files)])}
                    />
                  </label>
                  {updateFiles.length > 0 && (
                    <div className="ws-selected-files">
                      {updateFiles.map((f, i) => (
                        <span key={i} className="ws-selected-file">
                          {f.name}
                          <button type="button" className="ws-remove-file" onClick={() => setUpdateFiles(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button type="submit" className="ws-submit-btn" disabled={postingUpdate || !updateText.trim()}>
                    {postingUpdate ? 'Posting...' : '📢 Post Update'}
                  </button>
                </div>
              </form>
            )}

            {updates.length === 0 ? (
              <div className="ws-empty">
                <p>No updates yet. Post the first one!</p>
              </div>
            ) : (
              <div className="ws-updates-feed">
                {updates.map(upd => (
                  <div key={upd._id} className={`ws-update-item ws-update-${upd.type || 'update'}`}>
                    <div className="ws-update-avatar">
                      {upd.authorRole === 'system' ? '⚙️' : (upd.authorName?.charAt(0) || '?')}
                    </div>
                    <div className="ws-update-body">
                      <div className="ws-update-header">
                        <span className="ws-update-author">{upd.authorName}</span>
                        <span className="ws-update-role">{upd.authorRole}</span>
                        <span className="ws-update-time">{timeAgo(upd.createdAt)}</span>
                      </div>
                      <p className="ws-update-message">{upd.message}</p>
                      {upd.attachments && upd.attachments.length > 0 && (
                        <div className="ws-attachments ws-update-attachments">
                          <div className="ws-attachments-list">
                            {upd.attachments.map((file, fi) => (
                              <a
                                key={fi}
                                href={`${BACKEND_URL}${file.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ws-file-chip"
                                title={file.originalName}
                              >
                                <span className="ws-file-icon">{getFileIcon(file.mimetype)}</span>
                                <span className="ws-file-name">{file.originalName}</span>
                                <span className="ws-file-size">{formatFileSize(file.size)}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="ws-modal-overlay" onClick={() => setFeedbackModal(null)}>
          <div className="ws-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request Revision</h3>
            <p>Provide feedback on what needs to be changed:</p>
            <textarea
              className="ws-textarea"
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Describe what needs revision..."
            />
            <div className="ws-modal-actions">
              <button className="ws-action-btn ws-btn-gray" onClick={() => setFeedbackModal(null)}>Cancel</button>
              <button
                className="ws-action-btn ws-btn-red"
                onClick={() => handleMilestoneAction(feedbackModal, 'revision-requested', feedbackText)}
                disabled={!feedbackText.trim()}
              >Send Revision Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;
