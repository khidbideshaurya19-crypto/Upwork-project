import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole');
    
    if (token && userData) {
      try {
        if (userRole === 'admin') {
          // Admin auth check
          const response = await api.get('/admin/auth/profile');
          const adminData = { ...response.data.admin, role: 'admin' };
          setUser(adminData);
        } else {
          // Client/Company auth check
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    }
    setLoading(false);
  };

  // Login for client or company
  const login = async (email, password, role = 'client') => {
    if (role === 'admin') {
      return loginAdmin(email, password);
    }

    const response = await api.post('/auth/login', {
      email,
      password,
      role
    });
    
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userRole', role);
    setUser(user);
    return response.data;
  };

  // Login for admin
  const loginAdmin = async (email, password) => {
    const response = await api.post('/admin/auth/login', {
      email,
      password
    });
    
    const { token, admin } = response.data;
    const adminUser = { ...admin, role: 'admin' };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(adminUser));
    localStorage.setItem('userRole', 'admin');
    setUser(adminUser);
    return response.data;
  };

  // Signup for client
  const signup = async (name, email, password, location) => {
    const response = await api.post('/auth/signup', {
      name,
      email,
      password,
      role: 'client',
      location
    });
    
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userRole', 'client');
    setUser(user);
    return response.data;
  };

  // Signup for company
  const signupCompany = async (name, email, password, companyName, description, location) => {
    const response = await api.post('/auth/signup', {
      name,
      email,
      password,
      role: 'company',
      companyName,
      description,
      location
    });
    
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('userRole', 'company');
    setUser(user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAdmin, signup, signupCompany, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
