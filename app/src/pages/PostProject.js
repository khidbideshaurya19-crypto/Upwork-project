import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './PostProject.css';

const PostProject = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    budgetType: 'fixed',
    duration: '',
    skills: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableSkills = [
    'React',
    'Node.js',
    'Python',
    'Vue.js',
    'Angular',
    'TypeScript',
    'JavaScript',
    'MongoDB',
    'PostgreSQL',
    'MySQL',
    'AWS',
    'Docker',
    'Kubernetes',
    'GraphQL',
    'REST API',
    'Mobile Development',
    'iOS',
    'Android',
    'React Native',
    'Flutter',
    'UI/UX Design',
    'Figma',
    'Adobe XD',
    'Machine Learning',
    'TensorFlow',
    'Data Analysis',
    'DevOps',
    'CI/CD',
    'Git',
    'Blockchain',
    'Solidity',
    'Web3',
    'QA Testing',
    'Selenium',
    'Jest',
    'Agile',
    'Scrum'
  ];

  const categories = [
    'Web Development',
    'Mobile Development',
    'AI & Machine Learning',
    'Design',
    'Data Science',
    'DevOps',
    'Blockchain',
    'Game Development',
    'QA & Testing',
    'Other'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const projectData = {
        ...formData,
        budget: parseFloat(formData.budget),
        skills: formData.skills
      };

      await api.post('/projects', projectData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="post-project-container">
      <Navbar />

      <div className="post-project-content">
        <div className="post-project-header">
          <h1>Post a New Project</h1>
          <p>Tell us about your project and connect with skilled companies</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="project-form">
          <div className="form-group">
            <label htmlFor="title">Project Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Build a WhatsApp AI chatbot"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Project Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="6"
              placeholder="Describe your project in detail. Include requirements, expectations, and any specific needs..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration</label>
              <input
                type="text"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g., 2 weeks, 1 month"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="budget">Budget *</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                required
                min="0"
                step="1"
                placeholder="Enter amount"
              />
            </div>

            <div className="form-group">
              <label htmlFor="budgetType">Budget Type *</label>
              <select
                id="budgetType"
                name="budgetType"
                value={formData.budgetType}
                onChange={handleChange}
                required
              >
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Required Skills</label>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>Click to select skills:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
              {availableSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => {
                    if (formData.skills.includes(skill)) {
                      handleRemoveSkill(skill);
                    } else {
                      setFormData({
                        ...formData,
                        skills: [...formData.skills, skill]
                      });
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: formData.skills.includes(skill) ? '#007bff' : '#e9ecef',
                    color: formData.skills.includes(skill) ? 'white' : '#333',
                    border: formData.skills.includes(skill) ? '2px solid #0056b3' : '2px solid #ddd',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {formData.skills.includes(skill) ? '✓ ' : ''}
                  {skill}
                </button>
              ))}
            </div>
            {formData.skills.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '8px' }}>Selected skills:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      style={{
                        backgroundColor: '#007bff',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.85rem'
                      }}
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          padding: '0',
                          lineHeight: '1'
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Posting...' : 'Post Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostProject;
