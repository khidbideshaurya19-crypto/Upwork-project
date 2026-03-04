import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminContext } from '../context/AdminContext';
import { adminLogin } from '../utils/api';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('admin@matchflow.com');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AdminContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await adminLogin(email, password);
      login(response.data.token, response.data.admin);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>Admin Login</h1>
        <p className="subtitle">Access the admin panel</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@matchflow.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="credentials-info">
          <h3>📋 Default Credentials:</h3>
          <p><strong>Super Admin:</strong></p>
          <p>Email: admin@matchflow.com</p>
          <p>Password: Admin@123456</p>
          <hr />
          <p><strong>Moderator:</strong></p>
          <p>Email: moderator@matchflow.com</p>
          <p>Password: Moderator@123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
