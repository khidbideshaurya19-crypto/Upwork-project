import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './AdminUsers.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  const parseDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, role, search]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/users', { params: { page, limit, role, search } });
      setUsers(response.data.users);
      setTotal(response.data.pagination.total);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!blockReason && !window.confirm('Block this user?')) return;
    try {
      await api.put(`/admin/users/${userId}/status`, { isActive: false, reason: blockReason });
      setBlockReason('');
      setSelectedUser(null);
      fetchUsers();
      alert('User blocked successfully');
    } catch (err) {
      alert('Failed to block user: ' + err.response?.data?.message);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { isActive: true, reason: '' });
      fetchUsers();
      alert('User unblocked successfully');
    } catch (err) {
      alert('Failed to unblock user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
      alert('User deleted successfully');
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleRoleFilter = (e) => {
    setRole(e.target.value);
    setPage(1);
  };

  if (isLoading && users.length === 0) {
    return <div className="adm-container"><div className="loading">Loading users...</div></div>;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="adm-container">
      <div className="adm-content">
        <div className="adm-page-title">
          <h1>User Management</h1>
          <p className="adm-page-subtitle">Search, filter and manage platform users</p>
        </div>

        <div className="adm-toolbar">
          <div className="adm-search-box">
            <svg className="adm-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search by name or email..." value={search} onChange={handleSearch} className="adm-search-input" />
          </div>
          <select value={role} onChange={handleRoleFilter} className="adm-select">
            <option value="">All Roles</option>
            <option value="client">Client</option>
            <option value="company">Company</option>
          </select>
          <span className="adm-count-badge">{total} users</span>
        </div>

        <div className="adm-section-card">
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="adm-cell-name">{user.name}</td>
                    <td className="adm-cell-email">{user.email}</td>
                    <td><span className={`adm-pill adm-pill--${user.role}`}>{user.role}</span></td>
                    <td>
                      <span className={`adm-pill ${user.isActive ? 'adm-pill--active' : 'adm-pill--blocked'}`}>
                        {user.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="adm-cell-date">{parseDate(user.createdAt)}</td>
                    <td>
                      <div className="adm-btn-group">
                        {user.isActive ? (
                          <button className="adm-action-btn adm-action-btn--warn" onClick={() => setSelectedUser(user._id)}>Block</button>
                        ) : (
                          <button className="adm-action-btn adm-action-btn--success" onClick={() => handleUnblockUser(user._id)}>Unblock</button>
                        )}
                        <button className="adm-action-btn adm-action-btn--danger" onClick={() => handleDeleteUser(user._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="adm-pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="adm-page-btn">Previous</button>
            <span className="adm-page-info">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="adm-page-btn">Next</button>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="adm-overlay" onClick={() => setSelectedUser(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Block User</h2>
            <p className="adm-modal-desc">Provide a reason for blocking this user:</p>
            <textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Reason for blocking..." className="adm-textarea" />
            <div className="adm-modal-footer">
              <button className="adm-action-btn adm-action-btn--danger" onClick={() => handleBlockUser(selectedUser)}>Block User</button>
              <button className="adm-action-btn adm-action-btn--ghost" onClick={() => { setSelectedUser(null); setBlockReason(''); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
