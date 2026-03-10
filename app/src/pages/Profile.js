import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/ReviewModal';
import '../components/ReviewModal.css';
import api from '../utils/api';
import './Profile.css';

const Profile = () => {
  const { refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    phone: '',
    website: '',
    bio: '',
    industry: '',
    linkedin: '',
    twitter: '',
    github: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [myReviewSummary, setMyReviewSummary] = useState(null);

  useEffect(() => {
    fetchProfile();
    fetchMyReviews();
  }, []);

  const fetchMyReviews = async () => {
    try {
      const profileRes = await api.get('/profile');
      const myId = profileRes.data.user._id || profileRes.data.user.id;
      const [reviewsRes, summaryRes] = await Promise.all([
        api.get(`/reviews/user/${myId}`),
        api.get(`/reviews/summary/${myId}`)
      ]);
      setMyReviews(reviewsRes.data.reviews || []);
      setMyReviewSummary(summaryRes.data);
    } catch (err) {
      console.error('Error fetching my reviews:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      const userData = response.data.user;
      setProfileImage(userData.profileImage || '');
      setImagePreview(userData.profileImage || '');
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        location: userData.location || '',
        phone: userData.phone || '',
        website: userData.website || '',
        bio: userData.bio || '',
        industry: userData.industry || '',
        linkedin: userData.socialLinks?.linkedin || '',
        twitter: userData.socialLinks?.twitter || '',
        github: userData.socialLinks?.github || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size should be less than 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key]);
      });
      
      if (selectedFile) {
        submitData.append('profileImage', selectedFile);
      }

      await api.put('/profile', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMessage('Profile updated successfully!');
      setIsEditing(false);
      setSelectedFile(null);
      await refreshUser(); // Refresh user data in context
      fetchProfile();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompletion = () => {
    const fields = [
      formData.name,
      formData.email,
      formData.location,
      formData.phone,
      profileImage,
      formData.bio,
      formData.linkedin || formData.twitter || formData.github
    ];
    
    const completedFields = fields.filter(field => field && field.trim()).length;
    return Math.round((completedFields / fields.length) * 100);
  };

  const getProfileCompletionTips = () => {
    const tips = [];
    if (!formData.name) tips.push('Add your name');
    if (!formData.location) tips.push('Add your location');
    if (!formData.phone) tips.push('Add your phone number');
    if (!profileImage) tips.push('Upload a profile picture');
    if (!formData.bio) tips.push('Write a bio');
    if (!formData.linkedin && !formData.twitter && !formData.github) tips.push('Add social links');
    return tips;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters');
      return;
    }

    try {
      await api.put('/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setMessage('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update password');
    }
  };

  return (
    <>
      <Navbar />
      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="profile-content">
          {!isEditing ? (
            <div className="profile-page-layout">

              {/* Profile Header Card - full width, always visible */}
              <div className="profile-header-card">
                <div className="profile-header-left">
                  <div className="profile-header-avatar">
                    {imagePreview ? (
                      <img src={imagePreview.startsWith('http') ? imagePreview : `http://localhost:5000${imagePreview}`} alt="Profile" className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                      </div>
                    )}
                  </div>
                  <div className="profile-header-info">
                    <h2 className="profile-header-name">{formData.name || 'Your Name'}</h2>
                    <p className="profile-header-title">{formData.industry || 'Freelancer'}</p>
                    {formData.location && (
                      <p className="profile-header-location">📍 {formData.location}</p>
                    )}
                    {formData.bio && (
                      <p className="profile-header-bio">
                        {formData.bio.length > 150 ? formData.bio.substring(0, 150) + '...' : formData.bio}
                      </p>
                    )}
                    <div className="profile-header-actions">
                      <button className="btn-edit" onClick={() => setIsEditing(true)}>Edit Profile</button>
                      <button className="btn-secondary" onClick={() => setShowPasswordModal(true)}>Change Password</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-column layout: Details + Sidebar */}
              <div className="profile-view-wrapper">
                {/* LEFT: Profile Details */}
                <div className="profile-view-main">
                  <div className="profile-section">
                    <h2>Personal Information</h2>
                    <div className="profile-grid">
                      <div className="profile-item">
                        <label>Name</label>
                        <p>{formData.name || 'Not provided'}</p>
                      </div>
                      <div className="profile-item">
                        <label>Email</label>
                        <p>{formData.email}</p>
                      </div>
                      <div className="profile-item">
                        <label>Location</label>
                        <p>{formData.location || 'Not provided'}</p>
                      </div>
                      <div className="profile-item">
                        <label>Phone</label>
                        <p>{formData.phone || 'Not provided'}</p>
                      </div>
                      <div className="profile-item">
                        <label>Website</label>
                        <p>{formData.website || 'Not provided'}</p>
                      </div>
                      <div className="profile-item">
                        <label>Industry</label>
                        <p>{formData.industry || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="profile-section">
                    <h2>Bio</h2>
                    <p className="bio-text">{formData.bio || 'No bio added yet. Click Edit Profile to add one.'}</p>
                  </div>

                  <div className="profile-section">
                    <h2>Social Links</h2>
                    <div className="social-links">
                      {formData.linkedin && (
                        <a href={formData.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                      )}
                      {formData.twitter && (
                        <a href={formData.twitter} target="_blank" rel="noopener noreferrer">Twitter</a>
                      )}
                      {formData.github && (
                        <a href={formData.github} target="_blank" rel="noopener noreferrer">GitHub</a>
                      )}
                      {!formData.linkedin && !formData.twitter && !formData.github && (
                        <p>No social links added yet</p>
                      )}
                    </div>
                  </div>

                  {/* My Reviews Section */}
                  <div className="profile-section reviews-section">
                    <div className="reviews-section-header">
                      <h2>My Reviews</h2>
                      {myReviewSummary?.topRated && (
                        <span className="top-rated-badge top-rated-badge-lg">★ Top Rated</span>
                      )}
                    </div>

                    {myReviewSummary && myReviewSummary.totalReviews > 0 ? (
                      <>
                        <div className="reviews-summary">
                          <div className="reviews-summary-score">
                            <div className="big-rating">{myReviewSummary.averageRating}</div>
                            <StarRating rating={Math.round(myReviewSummary.averageRating)} interactive={false} size={18} />
                            <div className="total-reviews">{myReviewSummary.totalReviews} review{myReviewSummary.totalReviews !== 1 ? 's' : ''}</div>
                          </div>
                          <div className="reviews-distribution">
                            {[5, 4, 3, 2, 1].map(star => (
                              <div key={star} className="distribution-row">
                                <span className="star-label">{star}</span>
                                <span style={{ color: '#f59e0b', fontSize: 12 }}>★</span>
                                <div className="distribution-bar">
                                  <div
                                    className="distribution-fill"
                                    style={{ width: `${myReviewSummary.totalReviews > 0 ? (myReviewSummary.distribution[star] / myReviewSummary.totalReviews) * 100 : 0}%` }}
                                  />
                                </div>
                                <span className="distribution-count">{myReviewSummary.distribution[star]}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {myReviews.map(review => (
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
                      <div className="no-reviews">No reviews received yet</div>
                    )}
                  </div>
                </div>

                {/* RIGHT: Profile Completion Sidebar */}
                <div className="profile-sidebar">
                  <div className="profile-completion-card">
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: '700', color: '#222' }}>
                      Profile completeness
                    </h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#666', lineHeight: '1.5' }}>
                      Increase your profile visibility in search results and attract more proposals.
                    </p>

                    {calculateProfileCompletion() < 100 && (
                      <button
                        onClick={() => setIsEditing(true)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          backgroundColor: 'white',
                          color: '#007bff',
                          border: '2px solid #007bff',
                          borderRadius: '20px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          marginBottom: '18px'
                        }}
                      >
                        Complete your profile
                      </button>
                    )}

                    <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.8rem', color: '#666' }}>Progress</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: calculateProfileCompletion() === 100 ? '#28a745' : '#007bff' }}>
                        {calculateProfileCompletion()}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: '#e9ecef', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{
                        height: '100%',
                        width: `${calculateProfileCompletion()}%`,
                        backgroundColor: calculateProfileCompletion() === 100 ? '#28a745' : '#007bff',
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>

                    {getProfileCompletionTips().length > 0 && (
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '14px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: '600', color: '#333' }}>Tips to get more work:</p>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem' }}>
                          {getProfileCompletionTips().map((tip, index) => (
                            <li key={index} style={{ color: '#555', marginBottom: '5px' }}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {calculateProfileCompletion() === 100 && (
                      <div style={{ textAlign: 'center', color: '#28a745', fontWeight: '600', fontSize: '0.9rem' }}>
                        ✓ Profile complete!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-section profile-picture-section">
                <h2>Profile Picture</h2>
                <div className="profile-avatar-upload">
                  <div className="profile-avatar-preview">
                    {imagePreview ? (
                      <img src={imagePreview.startsWith('http') ? imagePreview : imagePreview.startsWith('blob:') ? imagePreview : `http://localhost:5000${imagePreview}`} alt="Profile Preview" className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {formData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="upload-controls">
                    <input
                      type="file"
                      id="profileImage"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="profileImage" className="btn-upload">
                      Choose Photo
                    </label>
                    <p className="upload-hint">JPG, PNG or GIF (max 5MB)</p>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2>Personal Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email (Read-only)</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g., New York, USA"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      placeholder="e.g., Technology, Finance"
                    />
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2>Bio</h2>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Tell us about yourself..."
                />
                <small>{formData.bio.length} characters</small>
              </div>

              <div className="profile-section">
                <h2>Social Links</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>LinkedIn</label>
                    <input
                      type="url"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>Twitter</label>
                    <input
                      type="url"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleChange}
                      placeholder="https://twitter.com/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub</label>
                    <input
                      type="url"
                      name="github"
                      value={formData.github}
                      onChange={handleChange}
                      placeholder="https://github.com/username"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => {setIsEditing(false); fetchProfile();}}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>

        {showPasswordModal && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Change Password</h2>
              <form onSubmit={handlePasswordChange}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Profile;
