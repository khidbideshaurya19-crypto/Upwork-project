import React, { useState, useEffect } from 'react';
import { getReports } from '../utils/api';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await getReports();
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
    return <div className="loading">Loading reports...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="reports-container">
      <h1>📈 Platform Reports</h1>

      <div className="reports-grid">
        <section className="report-section">
          <h2>📊 User Growth (Last 30 Days)</h2>
          <div className="chart-placeholder">
            {reports?.usersPerDay && reports.usersPerDay.length > 0 ? (
              <div className="growth-list">
                {reports.usersPerDay.map((item, index) => (
                  <div key={index} className="growth-item">
                    <span className="date">{item._id}</span>
                    <span className="bar">
                      <span 
                        className="bar-fill"
                        style={{ width: `${Math.min(item.count * 10, 100)}%` }}
                      ></span>
                    </span>
                    <span className="count">{item.count} users</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </section>

        <section className="report-section">
          <h2>🚀 Projects Posted (Last 30 Days)</h2>
          <div className="chart-placeholder">
            {reports?.projectsPerDay && reports.projectsPerDay.length > 0 ? (
              <div className="growth-list">
                {reports.projectsPerDay.map((item, index) => (
                  <div key={index} className="growth-item">
                    <span className="date">{item._id}</span>
                    <span className="bar">
                      <span 
                        className="bar-fill projects"
                        style={{ width: `${Math.min(item.count * 10, 100)}%` }}
                      ></span>
                    </span>
                    <span className="count">{item.count} projects</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </section>

        <section className="report-section full-width">
          <h2>🏆 Top Categories</h2>
          <div className="categories-list">
            {reports?.topCategories && reports.topCategories.length > 0 ? (
              <table className="categories-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Number of Projects</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.topCategories.map((category, index) => {
                    const total = reports.topCategories.reduce((sum, c) => sum + c.count, 0);
                    const percentage = ((category.count / total) * 100).toFixed(1);
                    return (
                      <tr key={index}>
                        <td className="category-name">
                          {category._id || 'Uncategorized'}
                        </td>
                        <td className="category-count">{category.count}</td>
                        <td>
                          <div className="percentage-bar">
                            <span 
                              className="percentage-fill"
                              style={{ width: `${percentage}%` }}
                            ></span>
                          </div>
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p>No data available</p>
            )}
          </div>
        </section>
      </div>

      <div className="export-section">
        <button className="export-btn" onClick={() => window.print()}>
          📥 Export Report
        </button>
        <button className="refresh-btn" onClick={fetchReports}>
          🔄 Refresh
        </button>
      </div>
    </div>
  );
};

export default Reports;
