import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { io } from 'socket.io-client';
import './Navbar.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const socketRef = React.useRef(null);
  const searchTimeoutRef = React.useRef(null);

  useEffect(() => {
    if (user) {
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
      userId: user.id,
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
      
      const total = response.data.conversations.reduce((sum, conv) => 
        sum + conv.unreadCountCompany, 0
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

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/search?query=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSearchResults(response.data.users || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleResultClick = (userId) => {
    navigate(`/user/${userId}`);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleSearchBlur = () => {
    // Delay to allow result click
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  return (
    <nav className="upw-nav">
      <div className="upw-nav-inner">
        {/* Left: Logo */}
        <div className="upw-nav-left">
          <Link to="/dashboard" className="upw-logo">
            <span className="upw-logo-text">upwork</span>
          </Link>
        </div>

        {/* Right: Nav links + Search + Icons + User */}
        <div className="upw-nav-right">
          <div className="upw-nav-links">
            <button className="upw-nav-link" onClick={() => navigate('/dashboard')}>
              Find Work <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button className="upw-nav-link" onClick={() => navigate('/dashboard?tab=applications')}>
              My Applications <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button className="upw-nav-link" onClick={() => navigate('/payments')}>
              Payments <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <Link to="/messages" className="upw-nav-link upw-nav-link--a">
              Messages
              {unreadCount > 0 && <span className="upw-badge">{unreadCount}</span>}
            </Link>
          </div>
          <div className="upw-nav-search">
            <div className="upw-search-box">
              <svg className="upw-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                onBlur={handleSearchBlur}
                className="upw-search-input"
              />
              <span className="upw-search-divider"></span>
              <button className="upw-search-filter" type="button">
                Jobs <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>
            {showSearchResults && (
              <div className="upw-search-dropdown">
                {searchLoading ? (
                  <div className="upw-search-item">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <div key={result._id} className="upw-search-item" onClick={() => handleResultClick(result._id)}>
                      <div className="upw-search-avatar">{result.name?.charAt(0).toUpperCase()}</div>
                      <div className="upw-search-info">
                        <span className="upw-search-name">{result.name}</span>
                        <span className="upw-search-meta">
                          {result.location}{result.industry && ` · ${result.industry}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="upw-search-item">No results found</div>
                )}
              </div>
            )}
          </div>

          <button className="upw-icon-btn" title="Help">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </button>
          <button className="upw-icon-btn" title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          <button className="upw-icon-btn" title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#62646a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          <div className="upw-nav-user" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="upw-user-avatar">
              {user?.companyName?.charAt(0).toUpperCase()}
            </div>
            {showUserMenu && (
              <div className="upw-user-dropdown">
                <div className="upw-user-dropdown-item" onClick={(e) => { e.stopPropagation(); setShowUserMenu(false); navigate('/profile'); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Profile
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
