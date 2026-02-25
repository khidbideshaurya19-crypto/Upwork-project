import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './UserProfile.css';

const UserProfile = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/search/user/${userId}`);
        setUser(response.data.user);
        setError('');
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="user-profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <div className="user-profile-container">
          <div className="error">{error || 'User not found'}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="user-profile-container">
        <div className="profile-card">
          <div className="profile-header-section">
            <div className="profile-avatar-large">
              {user.companyName?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-header-info">
              <h1>{user.companyName || user.name}</h1>
              <div className="profile-meta">
                {user.location && <span>📍 {user.location}</span>}
                {user.industry && <span>🏢 {user.industry}</span>}
              </div>
            </div>
          </div>

          {user.bio && (
            <div className="profile-section">
              <h2>{user.role === 'company' ? 'About Company' : 'About'}</h2>
              <p className="bio-text">{user.bio}</p>
            </div>
          )}

          <div className="profile-section">
            <h2>Contact Information</h2>
            <div className="info-grid">
              {user.email && (
                <div className="info-item">
                  <label>Email</label>
                  <a href={`mailto:${user.email}`}>{user.email}</a>
                </div>
              )}
              {user.phone && (
                <div className="info-item">
                  <label>Phone</label>
                  <a href={`tel:${user.phone}`}>{user.phone}</a>
                </div>
              )}
              {user.website && (
                <div className="info-item">
                  <label>Website</label>
                  <a href={user.website} target="_blank" rel="noopener noreferrer">{user.website}</a>
                </div>
              )}
            </div>
          </div>

          {user.role === 'company' && (
            <>
              {(user.companySize || user.foundedYear) && (
                <div className="profile-section">
                  <h2>Company Details</h2>
                  <div className="info-grid">
                    {user.companySize && (
                      <div className="info-item">
                        <label>Company Size</label>
                        <p>{user.companySize}</p>
                      </div>
                    )}
                    {user.foundedYear && (
                      <div className="info-item">
                        <label>Founded</label>
                        <p>{user.foundedYear}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {user.skills && user.skills.length > 0 && (
            <div className="profile-section">
              <h2>{user.role === 'company' ? 'Areas of Expertise' : 'Skills'}</h2>
              <div className="skills-display">
                {user.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {user.socialLinks && (user.socialLinks.linkedin || user.socialLinks.twitter || user.socialLinks.github) && (
            <div className="profile-section">
              <h2>Social Links</h2>
              <div className="social-links">
                {user.socialLinks.linkedin && (
                  <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">
                    LinkedIn
                  </a>
                )}
                {user.socialLinks.twitter && (
                  <a href={user.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="social-link">
                    Twitter
                  </a>
                )}
                {user.socialLinks.github && (
                  <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer" className="social-link">
                    GitHub
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserProfile;
