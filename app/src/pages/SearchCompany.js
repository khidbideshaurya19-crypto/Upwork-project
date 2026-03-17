import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Dashboard.css';

const SearchCompany = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    industry: '',
    skills: '',
    minRating: '',
    maxRating: '',
    minJobsCompleted: '',
    verified: ''
  });
  const searchTimeoutRef = useRef(null);

  const hasAnyFilter = () => {
    return (
      searchQuery.trim() ||
      filters.location ||
      filters.industry ||
      filters.skills ||
      filters.minRating ||
      filters.maxRating ||
      filters.minJobsCompleted ||
      filters.verified
    );
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!hasAnyFilter()) {
      setCompanies([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch();
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filters]);

  const handleSearch = async () => {
    try {
      setError('');
      const response = await api.get('/search', {
        params: {
          query: searchQuery || undefined,
          location: filters.location || undefined,
          industry: filters.industry || undefined,
          skills: filters.skills || undefined,
          minRating: filters.minRating || undefined,
          maxRating: filters.maxRating || undefined,
          minJobsCompleted: filters.minJobsCompleted || undefined,
          verified: filters.verified || undefined
        }
      });

      setCompanies(response.data.users || []);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to search companies. Please try again.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="upw-page-title">
          <h1>Search Companies</h1>
        </div>

        <div style={{
          background: '#fff',
          border: '1px solid #d5dff5',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <input
              type="text"
              placeholder="Search by company name, skills, industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                gridColumn: '1 / -1'
              }}
            />
            
            <input
              type="text"
              placeholder="Location"
              value={filters.location}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />

            <input
              type="text"
              placeholder="Industry"
              value={filters.industry}
              onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />

            <input
              type="text"
              placeholder="Skills (comma-separated)"
              value={filters.skills}
              onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />

            <select
              value={filters.minRating}
              onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="">Min Rating</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>

            <select
              value={filters.maxRating}
              onChange={(e) => setFilters({ ...filters, maxRating: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="">Max Rating</option>
              <option value={5}>5 Stars</option>
              <option value={4.5}>Up to 4.5</option>
              <option value={4}>Up to 4</option>
            </select>

            <input
              type="number"
              min="0"
              placeholder="Min Jobs Completed"
              value={filters.minJobsCompleted}
              onChange={(e) => setFilters({ ...filters, minJobsCompleted: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />

            <select
              value={filters.verified}
              onChange={(e) => setFilters({ ...filters, verified: e.target.value })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="">Verification</option>
              <option value="true">Verified only</option>
              <option value="false">Unverified only</option>
            </select>

            <button
              type="button"
              onClick={() => setFilters({
                location: '',
                industry: '',
                skills: '',
                minRating: '',
                maxRating: '',
                minJobsCompleted: '',
                verified: ''
              })}
              style={{
                padding: '12px 16px',
                border: '1px solid #d5dff5',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            padding: '12px 16px',
            color: '#c00',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">Searching companies...</div>
        ) : companies.length === 0 && hasAnyFilter() ? (
          <div className="empty-state">
            <p>No companies found. Try a different search.</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="empty-state">
            <p>Search by text or use filters to find companies.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {companies.map((company) => (
              <div
                key={company._id}
                onClick={() => navigate(`/user/${company._id}`)}
                style={{
                  background: '#fff',
                  border: '1px solid #d5dff5',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0d6efd';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d5dff5';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: '#0d6efd',
                  color: '#fff',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: '700',
                  marginBottom: '12px'
                }}>
                  {(company.companyName || company.name)?.charAt(0).toUpperCase()}
                </div>

                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f57c3',
                  margin: '0 0 6px',
                  cursor: 'pointer'
                }}>
                  {company.companyName || company.name}
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: '0 0 12px',
                  lineHeight: '1.5',
                  minHeight: '38px'
                }}>
                  {company.description || 'No description provided'}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#6b7280',
                  flexWrap: 'wrap'
                }}>
                  {company.verified && (
                    <span style={{ fontSize: '12px', color: '#0d6efd', fontWeight: '600' }}>✓ Verified</span>
                  )}
                  {company.rating && (
                    <span>⭐ {company.rating.toFixed(1)}</span>
                  )}
                  {company.jobsCompleted && (
                    <span>📊 {company.jobsCompleted} jobs</span>
                  )}
                </div>

                {company.location && (
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '0 0 12px'
                  }}>
                    📍 {company.location}
                  </p>
                )}

                {company.industry && (
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '0 0 12px'
                  }}>
                    🏢 {company.industry}
                  </p>
                )}

                {company.skills && company.skills.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {company.skills.slice(0, 3).map((skill, index) => (
                      <span key={index} style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        background: '#e9e9e9',
                        color: '#0f172a',
                        borderRadius: '16px',
                        fontSize: '12px',
                        marginRight: '6px',
                        marginBottom: '6px'
                      }}>
                        {skill}
                      </span>
                    ))}
                    {company.skills.length > 3 && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        +{company.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${company._id}`);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#0d6efd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#0b5ed7'}
                  onMouseLeave={(e) => e.target.style.background = '#0d6efd'}
                >
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchCompany;
