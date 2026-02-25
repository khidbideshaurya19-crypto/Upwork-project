import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminContext } from '../context/AdminContext';

const PrivateRoute = ({ children }) => {
  const { adminToken } = useContext(AdminContext);

  return adminToken ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
