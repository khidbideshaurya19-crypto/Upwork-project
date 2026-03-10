import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { StarRating } from '../components/ReviewModal';
import '../components/ReviewModal.css';
import api from '../utils/api';
import './UserProfile.css';

const UserProfile = () => {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(null);

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
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchReviews = async () => {
    try {
      const [reviewsRes, summaryRes] = await Promise.all([
        api.get(`/reviews/user/${userId}`),
        api.get(`/reviews/summary/${userId}`)
      ]);
      setReviews(reviewsRes.data.reviews || []);
      setReviewSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

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
              <h1>
                {user.companyName || user.name}
                {(user.topRated || (reviewSummary && reviewSummary.topRated)) && (
                  <span className="top-rated-badge top-rated-badge-lg" style={{ marginLeft: 12, verticalAlign: 'middle' }}>★ Top Rated</span>
                )}
              </h1>
              <div className="profile-meta">
                {user.location && <span>📍 {user.location}</span>}
                {user.industry && <span>🏢 {user.industry}</span>}
                {reviewSummary && reviewSummary.totalReviews > 0 && (
                  <span className="inline-rating">
                    <StarRating rating={Math.round(reviewSummary.averageRating)} interactive={false} size={14} />
                    <span className="rating-value">{reviewSummary.averageRating}</span>
                    <span className="rating-count">({reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? 's' : ''})</span>
                  </span>
                )}
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
          {/* Reviews Section */}
          <div className="profile-section reviews-section">
            <div className="reviews-section-header">
              <h2>Reviews & Ratings</h2>
            </div>

            {reviewSummary && reviewSummary.totalReviews > 0 ? (
              <>
                <div className="reviews-summary">
                  <div className="reviews-summary-score">
                    <div className="big-rating">{reviewSummary.averageRating}</div>
                    <StarRating rating={Math.round(reviewSummary.averageRating)} interactive={false} size={18} />
                    <div className="total-reviews">{reviewSummary.totalReviews} review{reviewSummary.totalReviews !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="reviews-distribution">
                    {[5, 4, 3, 2, 1].map(star => (
                      <div key={star} className="distribution-row">
                        <span className="star-label">{star}</span>
                        <span style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
                        <div className="distribution-bar">
                          <div
                            className="distribution-fill"
                            style={{ width: `${reviewSummary.totalReviews > 0 ? (reviewSummary.distribution[star] / reviewSummary.totalReviews) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="distribution-count">{reviewSummary.distribution[star]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {reviews.map(review => (
                  <div key={review._id} className="review-card">
                    <div className="review-card-header">
                      <div className="review-card-author">
                        <div className="review-avatar">
                          {(review.reviewerName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="review-author-name">{review.reviewerName}</div>
                          <div className="review-author-role">{review.reviewerRole === 'client' ? 'Client' : 'Company'}</div>
                        </div>
                      </div>
                      <span className="review-date">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="review-card-stars">
                      <StarRating rating={review.rating} interactive={false} size={16} />
                    </div>
                    {review.comment && (
                      <p className="review-card-comment">{review.comment}</p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="no-reviews">No reviews yet</div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default UserProfile;
