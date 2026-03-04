import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import './Navbar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const socketRef = React.useRef(null);

  const userRole = user?.role;
  const isAdmin = userRole === 'admin';
  const isCompany = userRole === 'company';
  const isClient = userRole === 'client';

  useEffect(() => {
    if (user && !isAdmin) {
      fetchUnreadCount();
      setupSocket();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const setupSocket = () => {
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.emit('join', {
      userId: user.id || user._id,
      role: user.role
    });

    socketRef.current.on('newMessage', () => {
      fetchUnreadCount();
    });

    socketRef.current.on('messagesRead', () => {
      fetchUnreadCount();
    });

    socketRef.current.on('conversationStarted', () => {
      fetchUnreadCount();
    });

    socketRef.current.on('conversationDeleted', () => {
      fetchUnreadCount();
    });

    socketRef.current.on('chatCleared', () => {
      fetchUnreadCount();
    });
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const countField = isCompany ? 'unreadCountCompany' : 'unreadCountClient';
      const total = response.data.conversations.reduce((sum, conv) => 
        sum + (conv[countField] || 0), 0
      );
      setUnreadCount(total);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Admin Navbar
  if (isAdmin) {
    return (
      <nav className="upw-nav">
        <div className="upw-nav-inner">
          <div className="upw-nav-left">
            <Link to="/admin/dashboard" className="upw-logo">
              <span className="upw-logo-text">MatchFlow</span>
              <span className="adm-logo-tag">Admin</span>
            </Link>
          </div>

          <div className="upw-nav-right">
            <div className="upw-nav-links">
              <button className="upw-nav-link" onClick={() => navigate('/admin/dashboard')}>
                Dashboard
              </button>
              <button className="upw-nav-link" onClick={() => navigate('/admin/users')}>
                Users
              </button>
              <button className="upw-nav-link" onClick={() => navigate('/admin/projects')}>
                Projects
              </button>
              <button className="upw-nav-link" onClick={() => navigate('/admin/reports')}>
                Reports
              </button>
              <button className="upw-nav-link" onClick={() => navigate('/admin/company-verification')}>
                Verification
              </button>
            </div>

            <button className="upw-icon-btn" title="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>

            <div className="upw-nav-user" onClick={() => setShowUserMenu(!showUserMenu)}>
              <div className="upw-user-avatar">
                {user?.profileImage ? (
                  <img 
                    src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`} 
                    alt="Profile" 
                    className="upw-user-avatar-img"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              {showUserMenu && (
                <div className="upw-user-dropdown">
                  <div className="upw-user-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); navigate('/profile?tab=settings'); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Settings
                  </div>
                  <div className="upw-user-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Help & Support
                  </div>
                  <div className="upw-user-dropdown-item upw-user-dropdown-item--danger" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); handleLogout(); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Log Out
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Client / Company Navbar
  return (
    <nav className="upw-nav">
      <div className="upw-nav-inner">
        <div className="upw-nav-left">
          <Link to="/dashboard" className="upw-logo">
            <span className="upw-logo-text">MatchFlow</span>
          </Link>
        </div>

        <div className="upw-nav-right">
          <div className="upw-nav-links">
            {isClient && (
              <>
                <button className="upw-nav-link" onClick={() => navigate('/dashboard')}>
                  My Projects
                </button>
              </>
            )}
            {isCompany && (
              <>
                <button className="upw-nav-link" onClick={() => navigate('/dashboard')}>
                  Find Work
                </button>
                <button className="upw-nav-link" onClick={() => navigate('/dashboard?tab=applications')}>
                  My Applications
                </button>
              </>
            )}
            {(isClient || isCompany) && (
              <button className="upw-nav-link" onClick={() => navigate('/contracts')}>
                My Contracts
              </button>
            )}
            <button className="upw-nav-link" onClick={() => navigate('/application-status')}>
              Application Status
            </button>
            <Link to="/messages" className="upw-nav-link upw-nav-link--a">
              Messages
              {unreadCount > 0 && <span className="upw-badge">{unreadCount}</span>}
            </Link>
            {isClient && (
              <button className="upw-nav-link" onClick={() => navigate('/post-project')}>
                Post Project
              </button>
            )}
          </div>

          <button className="upw-icon-btn" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <button className="upw-icon-btn" title={isDark ? "Light Mode" : "Dark Mode"} onClick={toggleTheme}>
            {isDark ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <div className="upw-nav-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="upw-user-avatar">
              {user?.profileImage ? (
                <img 
                  src={user.profileImage.startsWith('http') ? user.profileImage : `http://localhost:5000${user.profileImage}`} 
                  alt="Profile" 
                  className="upw-user-avatar-img"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            {showUserMenu && (
              <div className="upw-user-dropdown">
                <div className="upw-user-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); navigate('/profile'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile
                </div>
                <div className="upw-user-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); navigate('/profile?tab=settings'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                  Settings
                </div>
                <div className="upw-user-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Help & Support
                </div>
                <div className="upw-user-dropdown-item upw-user-dropdown-item--danger" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); handleLogout(); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Log Out
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
