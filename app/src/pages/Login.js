import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('client');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password, selectedRole);
      if (selectedRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const resData = err.response?.data;
      // If company is pending/rejected, show verification status message
      if (resData?.verificationStatus === 'pending' || resData?.verificationStatus === 'rejected') {
        setError(resData.message);
      } else {
        setError(resData?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const roleLabels = {
    client: { title: 'Client Login', desc: 'Post projects and hire companies' },
    company: { title: 'Company Login', desc: 'Browse projects and apply for work' },
    admin: { title: 'Admin Login', desc: 'Manage the platform' }
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
          <button
            className={`role-tab ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => { setSelectedRole('admin'); setError(''); }}
          >
            Admin
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
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

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              minLength="6"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : `Login as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
          </button>
        </form>

        {selectedRole === 'admin' && (
          <div className="credentials-hint">
            <p><strong>Default Admin:</strong> admin@upwork.com / Admin@123456</p>
          </div>
        )}

        <div className="auth-footer">
          {selectedRole !== 'admin' && (
            <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          )}
          <p><Link to="/">Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
