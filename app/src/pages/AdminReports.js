import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AdminReports.css';

const AdminReports = () => {
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/reports');
      setReports(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load reports');
      console.error('Reports error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="adm-container"><div className="loading">Loading reports...</div></div>;
  }

  if (error) {
    return <div className="adm-container"><div className="adm-error-banner">{error}</div></div>;
  }

  return (
    <div className="adm-container">
      <div className="adm-content">
        <div className="adm-page-title">
          <h1>Platform Reports</h1>
          <p className="adm-page-subtitle">Growth analytics and category insights</p>
        </div>

        <div className="adm-reports-row">
          <section className="adm-section-card">
            <div className="adm-section-header">
              <h2>User Growth (Last 30 Days)</h2>
            </div>
            <div className="adm-report-body">
              {reports?.usersPerDay && reports.usersPerDay.length > 0 ? (
                <div className="adm-bar-list">
                  {reports.usersPerDay.map((item, index) => (
                    <div key={index} className="adm-bar-row">
                      <span className="adm-bar-label">{item._id}</span>
                      <div className="adm-bar-track">
                        <div className="adm-bar-fill adm-bar-fill--blue" style={{ width: `${Math.min(item.count * 10, 100)}%` }} />
                      </div>
                      <span className="adm-bar-value">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="adm-empty">No data available</div>
              )}
            </div>
          </section>

          <section className="adm-section-card">
            <div className="adm-section-header">
              <h2>Projects Posted (Last 30 Days)</h2>
            </div>
            <div className="adm-report-body">
              {reports?.projectsPerDay && reports.projectsPerDay.length > 0 ? (
                <div className="adm-bar-list">
                  {reports.projectsPerDay.map((item, index) => (
                    <div key={index} className="adm-bar-row">
                      <span className="adm-bar-label">{item._id}</span>
                      <div className="adm-bar-track">
                        <div className="adm-bar-fill adm-bar-fill--green" style={{ width: `${Math.min(item.count * 10, 100)}%` }} />
                      </div>
                      <span className="adm-bar-value">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="adm-empty">No data available</div>
              )}
            </div>
          </section>
        </div>

        <section className="adm-section-card">
          <div className="adm-section-header">
            <h2>Top Categories</h2>
          </div>
          <div className="adm-table-wrap">
            {reports?.topCategories && reports.topCategories.length > 0 ? (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Projects</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.topCategories.map((category, index) => {
                    const totalCount = reports.topCategories.reduce((sum, c) => sum + c.count, 0);
                    const pct = ((category.count / totalCount) * 100).toFixed(1);
                    return (
                      <tr key={index}>
                        <td className="adm-cell-name" style={{ textTransform: 'capitalize' }}>{category._id || 'Uncategorized'}</td>
                        <td className="adm-cell-budget">{category.count}</td>
                        <td>
                          <div className="adm-pct-wrap">
                            <div className="adm-pct-track">
                              <div className="adm-pct-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="adm-pct-label">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="adm-empty">No data available</div>
            )}
          </div>
        </section>

        <div className="adm-report-actions">
          <button className="adm-action-btn adm-action-btn--primary" onClick={() => window.print()}>Export Report</button>
          <button className="adm-action-btn adm-action-btn--ghost" onClick={fetchReports}>Refresh</button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
