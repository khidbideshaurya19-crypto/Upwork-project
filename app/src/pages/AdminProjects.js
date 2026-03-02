import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AdminProjects.css';

const AdminProjects = () => {
  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const parseDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, status, search]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/projects', { params: { page, limit, status, search } });
      setProjects(response.data.projects);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error('Fetch projects error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (projectId) => {
    if (!newStatus) {
      alert('Please select a status');
      return;
    }
    try {
      await api.put(`/admin/projects/${projectId}/status`, { status: newStatus, reason: adminNotes });
      setSelectedProject(null);
      setNewStatus('');
      setAdminNotes('');
      fetchProjects();
      alert('Project status updated successfully');
    } catch (err) {
      alert('Failed to update project: ' + err.response?.data?.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.delete(`/admin/projects/${projectId}`);
      fetchProjects();
      alert('Project deleted successfully');
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const getStatusColor = (s) => {
    const colors = { open: '#10b981', in_progress: '#3b82f6', 'in-progress': '#3b82f6', closed: '#6b7280' };
    return colors[s] || '#6b7280';
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusFilter = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  if (isLoading && projects.length === 0) {
    return <div className="adm-container"><div className="loading">Loading projects...</div></div>;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="adm-container">
      <div className="adm-content">
        <div className="adm-page-title">
          <h1>Project Management</h1>
          <p className="adm-page-subtitle">Review, edit and manage platform projects</p>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search-box">
            <svg className="adm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search by title..." value={search} onChange={handleSearch} className="adm-search-input" />
          </div>
          <select value={status} onChange={handleStatusFilter} className="adm-select">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          <span className="adm-count-badge">{total} projects</span>
        </div>

        <div className="adm-section-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Posted By</th>
                  <th>Status</th>
                  <th>Budget</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project._id}>
                    <td className="adm-cell-name adm-cell-truncate">{project.title}</td>
                    <td className="adm-cell-email">{project.postedBy?.name || 'N/A'}</td>
                    <td>
                      <span className="adm-pill" style={{ backgroundColor: getStatusColor(project.status), color: '#fff' }}>
                        {project.status}
                      </span>
                    </td>
                    <td className="adm-cell-budget">${project.budget}</td>
                    <td className="adm-cell-date">{parseDate(project.deadline)}</td>
                    <td>
                      <div className="adm-btn-group">
                        <button className="adm-action-btn adm-action-btn--primary" onClick={() => { setSelectedProject(project._id); setNewStatus(project.status); }}>Edit</button>
                        <button className="adm-action-btn adm-action-btn--danger" onClick={() => handleDeleteProject(project._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="adm-pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="adm-page-btn">Previous</button>
            <span className="adm-page-info">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="adm-page-btn">Next</button>
          </div>
        )}
      </div>

      {selectedProject && (
        <div className="adm-overlay" onClick={() => setSelectedProject(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update Project Status</h2>
            <div className="adm-form-group">
              <label>New Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="adm-select adm-select--full">
                <option value="">Select Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="adm-form-group">
              <label>Admin Notes</label>
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Add notes..." className="adm-textarea" />
            </div>
            <div className="adm-modal-footer">
              <button className="adm-action-btn adm-action-btn--primary" onClick={() => handleStatusChange(selectedProject)}>Update</button>
              <button className="adm-action-btn adm-action-btn--ghost" onClick={() => { setSelectedProject(null); setNewStatus(''); setAdminNotes(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProjects;
