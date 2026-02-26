import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Profile.css';

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    location: '',
    phone: '',
    website: '',
    bio: '',
    companySize: '',
    foundedYear: '',
    industry: '',
    skills: [],
    specializations: [],
    linkedin: '',
    twitter: '',
    github: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/profile');
      const userData = response.data.user;
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        location: userData.location || '',
        phone: userData.phone || '',
        website: userData.website || '',
        bio: userData.bio || '',
        companySize: userData.companySize || '',
        foundedYear: userData.foundedYear || '',
        industry: userData.industry || '',
        skills: userData.skills || [],
        specializations: userData.specializations || [],
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

  const handleAddSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleAddSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, newSpecialization.trim()]
      });
      setNewSpecialization('');
    }
  };

  const handleRemoveSpecialization = (specializationToRemove) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter(spec => spec !== specializationToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await api.put('/profile', {
        ...formData,
        skills: JSON.stringify(formData.skills),
        specializations: JSON.stringify(formData.specializations)
      });

      setMessage('Profile updated successfully!');
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
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
          <h1>Company Profile</h1>
          {!isEditing && (
            <button className="btn-edit" onClick={() => setIsEditing(true)}>
              Edit Profile
            </button>
          )}
        </div>

        {message && (
          <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="profile-content">
          {!isEditing ? (
            <div className="profile-view">
              <div className="profile-section">
                <h2>Company Information</h2>
                <div className="profile-grid">
                  <div className="profile-item">
                    <label>Company Name</label>
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
                  <div className="profile-item">
                    <label>Company Size</label>
                    <p>{formData.companySize || 'Not provided'}</p>
                  </div>
                  <div className="profile-item">
                    <label>Founded Year</label>
                    <p>{formData.foundedYear || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2>Company Description</h2>
                <p className="bio-text">{formData.bio || 'No description added yet'}</p>
              </div>

              <div className="profile-section">
                <h2>Areas of Expertise</h2>
                <div className="skills-display">
                  {formData.skills.length > 0 ? (
                    formData.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))
                  ) : (
                    <p>No expertise areas added yet</p>
                  )}
                </div>
              </div>

              <div className="profile-section">
                <h2>Specializations</h2>
                <div className="skills-display">
                  {formData.specializations.length > 0 ? (
                    formData.specializations.map((spec, index) => (
                      <span key={index} className="skill-tag">{spec}</span>
                    ))
                  ) : (
                    <p>No specializations added yet</p>
                  )}
                </div>
              </div>

              <div className="profile-section">
                <h2>Social Links</h2>
                <div className="social-links">
                  {formData.linkedin && (
                    <a href={formData.linkedin} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  )}
                  {formData.twitter && (
                    <a href={formData.twitter} target="_blank" rel="noopener noreferrer">
                      Twitter
                    </a>
                  )}
                  {formData.github && (
                    <a href={formData.github} target="_blank" rel="noopener noreferrer">
                      GitHub
                    </a>
                  )}
                  {!formData.linkedin && !formData.twitter && !formData.github && (
                    <p>No social links added yet</p>
                  )}
                </div>
              </div>

              <div className="profile-actions">
                <button className="btn-secondary" onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="profile-form">
              <div className="profile-section">
                <h2>Company Information</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Company Name *</label>
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
                      placeholder="e.g., San Francisco, CA"
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
                  <div className="form-group">
                    <label>Company Size</label>
                    <select
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleChange}
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Founded Year</label>
                    <input
                      type="number"
                      name="foundedYear"
                      value={formData.foundedYear}
                      onChange={handleChange}
                      placeholder="e.g., 2020"
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h2>Company Description</h2>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="5"
                  placeholder="Tell us about your company..."
                />
                <small>{formData.bio.length} characters</small>
              </div>

              <div className="profile-section">
                <h2>Areas of Expertise</h2>
                <div className="skills-input">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                    placeholder="Add an area of expertise"
                  />
                  <button type="button" onClick={handleAddSkill} className="btn-add-skill">
                    Add
                  </button>
                </div>
                <div className="skills-list">
                  {formData.skills.map((skill, index) => (
                    <span key={index} className="skill-tag editable">
                      {skill}
                      <button type="button" onClick={() => handleRemoveSkill(skill)}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="profile-section">
                <h2>Specializations</h2>
                <div className="skills-input">
                  <input
                    type="text"
                    value={newSpecialization}
                    onChange={(e) => setNewSpecialization(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSpecialization())}
                    placeholder="Add a specialization"
                  />
                  <button type="button" onClick={handleAddSpecialization} className="btn-add-skill">
                    Add
                  </button>
                </div>
                <div className="skills-list">
                  {formData.specializations.map((spec, index) => (
                    <span key={index} className="skill-tag editable">
                      {spec}
                      <button type="button" onClick={() => handleRemoveSpecialization(spec)}>×</button>
                    </span>
                  ))}
                </div>
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
                      placeholder="https://linkedin.com/company/name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Twitter</label>
                    <input
                      type="url"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleChange}
                      placeholder="https://twitter.com/company"
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub</label>
                    <input
                      type="url"
                      name="github"
                      value={formData.github}
                      onChange={handleChange}
                      placeholder="https://github.com/company"
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
