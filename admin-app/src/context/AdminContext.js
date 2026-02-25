import React, { createContext, useState, useEffect } from 'react';

export const AdminContext = createContext();

export const AdminProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load admin data from localStorage on mount
  useEffect(() => {
    const savedAdmin = localStorage.getItem('admin');
    if (savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
    }
  }, []);

  const login = (token, adminData) => {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('admin', JSON.stringify(adminData));
    setAdminToken(token);
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    setAdminToken(null);
    setAdmin(null);
  };

  return (
    <AdminContext.Provider value={{
      adminToken,
      admin,
      isLoading,
      setIsLoading,
      login,
      logout
    }}>
      {children}
    </AdminContext.Provider>
  );
};
