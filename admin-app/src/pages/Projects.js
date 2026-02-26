import React, { useState, useEffect, useCallback } from 'react';
import { getAllProjects, updateProjectStatus, deleteProject } from '../utils/api';
import './Projects.css';

const Projects = () => {
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

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getAllProjects(page, limit, status, search);
      setProjects(response.data.projects);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error('Fetch projects error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, status, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleStatusChange = async (projectId) => {
    if (!newStatus) {
      alert('Please select a status');
      return;
    }

    try {
      await updateProjectStatus(projectId, newStatus, adminNotes);
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
      await deleteProject(projectId);
      fetchProjects();
      alert('Project deleted successfully');
    } catch (err) {
      alert('Failed to delete project');
    }
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
    return <div className="loading">Loading projects...</div>;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="projects-container">
      <h1>🚀 Project Management</h1>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />

        <select value={status} onChange={handleStatusFilter} className="status-filter">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="closed">Closed</option>
        </select>

        <span className="total-projects">Total: {total} projects</span>
      </div>

      <div className="projects-table-wrapper">
        <table className="projects-table">
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
                <td className="project-title">{project.title}</td>
                <td>{project.postedBy?.name || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${project.status}`}>
                    {project.status}
                  </span>
                </td>
                <td>${project.budget}</td>
                <td>{new Date(project.deadline).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => {
                        setSelectedProject(project._id);
                        setNewStatus(project.status);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteProject(project._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="pagination-btn"
        >
          Previous
        </button>
        <span className="page-info">Page {page} of {totalPages}</span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="pagination-btn"
        >
          Next
        </button>
      </div>

      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Update Project Status</h2>
            
            <div className="form-group">
              <label>New Status:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="status-select"
              >
                <option value="">Select Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Admin Notes:</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this action..."
                className="notes-input"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-confirm"
                onClick={() => handleStatusChange(selectedProject)}
              >
                Update
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setSelectedProject(null);
                  setNewStatus('');
                  setAdminNotes('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
