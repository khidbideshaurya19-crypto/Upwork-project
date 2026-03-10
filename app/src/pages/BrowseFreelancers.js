import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import '../components/ReviewModal.css';
import api from '../utils/api';
import './Dashboard.css';

const BrowseFreelancers = () => {
  const navigate = useNavigate();
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch(searchQuery);
    } else {
      fetchAllFreelancers();
    }
  }, [searchQuery]);

  const fetchAllFreelancers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/search?query=&type=company');
      setFreelancers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching freelancers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    try {
      setLoading(true);
      const response = await api.get(`/search?query=${encodeURIComponent(query)}&type=company`);
      setFreelancers(response.data.users || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <div className="dashboard-content">
        <div className="upw-page-title">
          <h1>Browse Freelancers</h1>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <input
            type="text"
            placeholder="Search by name, skills, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d5dff5',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {loading ? (
          <div className="loading">Loading freelancers...</div>
        ) : freelancers.length === 0 ? (
          <div className="empty-state">
            <p>No freelancers found. Try a different search.</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {freelancers.map((freelancer) => (
              <div
                key={freelancer._id}
                onClick={() => navigate(`/user/${freelancer._id}`)}
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
                  width: '48px',
                  height: '48px',
                  background: '#0d6efd',
                  color: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '600',
                  marginBottom: '12px'
                }}>
                  {(freelancer.companyName || freelancer.name)?.charAt(0).toUpperCase()}
                </div>

                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f57c3',
                  margin: '0 0 6px',
                  cursor: 'pointer'
                }}>
                  {freelancer.companyName || freelancer.name}
                </h3>

                <p style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  margin: '0 0 12px',
                  lineHeight: '1.5'
                }}>
                  {freelancer.description || 'No description provided'}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#6b7280'
                }}>
                  {freelancer.verified && (
                    <span style={{ fontSize: '12px', color: '#0d6efd', fontWeight: '600' }}>✓ Verified</span>
                  )}
                  {freelancer.topRated && (
                    <span className="top-rated-badge">★ Top Rated</span>
                  )}
                  {freelancer.rating > 0 && (
                    <span>⭐ {freelancer.rating.toFixed(1)} {freelancer.reviewCount ? `(${freelancer.reviewCount})` : ''}</span>
                  )}
                </div>

                {freelancer.location && (
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '0 0 12px'
                  }}>
                    📍 {freelancer.location}
                  </p>
                )}

                {freelancer.skills && freelancer.skills.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {freelancer.skills.slice(0, 3).map((skill, index) => (
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
                    {freelancer.skills.length > 3 && (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        +{freelancer.skills.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${freelancer._id}`);
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

export default BrowseFreelancers;
