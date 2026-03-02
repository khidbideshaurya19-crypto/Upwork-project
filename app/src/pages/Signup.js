import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const { signup, signupCompany } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState('client');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    companyName: '',
    description: '',
    websiteUrl: '',
    linkedinUrl: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Set role from URL parameter
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam && (roleParam === 'client' || roleParam === 'company')) {
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (selectedRole === 'company') {
        await signupCompany(
          formData.name,
          formData.email,
          formData.password,
          formData.companyName,
          formData.description,
          formData.location,
          formData.websiteUrl,
          formData.linkedinUrl
        );
        navigate('/pending-approval');
      } else {
        await signup(formData.name, formData.email, formData.password, formData.location);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    client: { title: 'Client Signup', desc: 'Create your account to post projects' },
    company: { title: 'Company Signup', desc: 'Create your account to find projects' }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>MatchFlow</h1>
          <h2>{roleLabels[selectedRole].title}</h2>
          <p>{roleLabels[selectedRole].desc}</p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="role-toggle">
          <button
            className={`role-tab ${selectedRole === 'client' ? 'active' : ''}`}
            onClick={() => { setSelectedRole('client'); setError(''); }}
          >
            Client
          </button>
          <button
            className={`role-tab ${selectedRole === 'company' ? 'active' : ''}`}
            onClick={() => { setSelectedRole('company'); setError(''); }}
          >
            Company
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          {selectedRole === 'company' && (
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                placeholder="Enter company name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          {selectedRole === 'company' && (
            <div className="form-group">
              <label htmlFor="description">Company Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                placeholder="Brief description of your company"
              ></textarea>
            </div>
          )}

          {selectedRole === 'company' && (
            <div className="form-group">
              <label htmlFor="websiteUrl">Company Website URL</label>
              <input
                type="url"
                id="websiteUrl"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleChange}
                placeholder="https://yourcompany.com"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>Helps verify your company identity</small>
            </div>
          )}

          {selectedRole === 'company' && (
            <div className="form-group">
              <label htmlFor="linkedinUrl">LinkedIn Company Page</label>
              <input
                type="url"
                id="linkedinUrl"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                placeholder="https://linkedin.com/company/yourcompany"
              />
              <small style={{ color: '#6b7280', fontSize: '12px' }}>Helps verify your company presence</small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., New York, USA"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : `Sign Up as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Login</Link></p>
          <p><Link to="/">Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
