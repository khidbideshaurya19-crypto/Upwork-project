import React, { useState, useEffect } from 'react';
import { getDashboard } from '../utils/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      const response = await getDashboard();
      setStats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard-container">
      <h1>📊 Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{stats?.users?.total || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Clients</h3>
          <p className="stat-number">{stats?.users?.clients || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Companies</h3>
          <p className="stat-number">{stats?.users?.companies || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-number">{stats?.projects?.total || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Active Projects</h3>
          <p className="stat-number">{stats?.projects?.active || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Applications</h3>
          <p className="stat-number">{stats?.applications || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Messages</h3>
          <p className="stat-number">{stats?.messages || 0}</p>
        </div>
      </div>

      <div className="dashboard-content">
        <section className="recent-users">
          <h2>🆕 Recent Users</h2>
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <table className="data-table">
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
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No recent users</p>
          )}
        </section>

        <section className="recent-projects">
          <h2>🚀 Recent Projects</h2>
          {stats?.recentProjects && stats.recentProjects.length > 0 ? (
            <table className="data-table">
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
                    <td>{project.title}</td>
                    <td>
                      <span className={`status-badge ${project.status}`}>
                        {project.status}
                      </span>
                    </td>
                    <td>${project.budget}</td>
                    <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No recent projects</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
