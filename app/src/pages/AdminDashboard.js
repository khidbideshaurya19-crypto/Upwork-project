import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { open: '#10b981', 'in-progress': '#3b82f6', in_progress: '#3b82f6', completed: '#8b5cf6', closed: '#6b7280' };
    return colors[status] || '#6b7280';
  };

  if (isLoading) {
    return <div className="adm-container"><div className="loading">Loading dashboard...</div></div>;
  }

  if (error) {
    return <div className="adm-container"><div className="adm-error-banner">{error}</div></div>;
  }

  return (
    <div className="adm-container">
      <div className="adm-content">
        <div className="adm-page-title">
          <h1>Dashboard Overview</h1>
          <p className="adm-page-subtitle">Platform statistics and recent activity</p>
        </div>

        <div className="adm-stats-row">
          <div className="adm-stat-card">
            <span className="adm-stat-icon">👥</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Total Users</span>
              <span className="adm-stat-value">{stats?.users?.total || 0}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">💼</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Clients</span>
              <span className="adm-stat-value">{stats?.users?.clients || 0}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">🏢</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Companies</span>
              <span className="adm-stat-value">{stats?.users?.companies || 0}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">📋</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Total Projects</span>
              <span className="adm-stat-value">{stats?.projects?.total || 0}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">🚀</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Active Projects</span>
              <span className="adm-stat-value">{stats?.projects?.active || 0}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">📝</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Applications</span>
              <span className="adm-stat-value">{stats?.applications || 0}</span>
            </div>
          </div>
          <div className="adm-stat-card">
            <span className="adm-stat-icon">💬</span>
            <div className="adm-stat-info">
              <span className="adm-stat-label">Messages</span>
              <span className="adm-stat-value">{stats?.messages || 0}</span>
            </div>
          </div>
        </div>

        <div className="adm-tables-layout">
          <section className="adm-section-card">
            <div className="adm-section-header">
              <h2>Recent Users</h2>
            </div>
            {stats?.recentUsers && stats.recentUsers.length > 0 ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((user) => (
                      <tr key={user._id}>
                        <td className="adm-cell-name">{user.name}</td>
                        <td className="adm-cell-email">{user.email}</td>
                        <td>
                          <span className={`adm-pill adm-pill--${user.role}`}>{user.role}</span>
                        </td>
                        <td className="adm-cell-date">{new Date(user.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="adm-empty">No recent users</div>
            )}
          </section>

          <section className="adm-section-card">
            <div className="adm-section-header">
              <h2>Recent Projects</h2>
            </div>
            {stats?.recentProjects && stats.recentProjects.length > 0 ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Budget</th>
                      <th>Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentProjects.map((project) => (
                      <tr key={project._id}>
                        <td className="adm-cell-name">{project.title}</td>
                        <td>
                          <span className="adm-pill" style={{ backgroundColor: getStatusColor(project.status), color: '#fff' }}>
                            {project.status}
                          </span>
                        </td>
                        <td className="adm-cell-budget">${project.budget}</td>
                        <td className="adm-cell-date">{new Date(project.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="adm-empty">No recent projects</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
