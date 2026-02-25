import React, { useState, useEffect } from 'react';
import { getAllUsers, updateUserStatus, deleteUser } from '../utils/api';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [page, limit, role, search]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await getAllUsers(page, limit, role, search);
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
      await updateUserStatus(userId, false, blockReason);
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
      await updateUserStatus(userId, true, '');
      fetchUsers();
      alert('User unblocked successfully');
    } catch (err) {
      alert('Failed to unblock user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await deleteUser(userId);
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
    return <div className="loading">Loading users...</div>;
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="users-container">
      <h1>👥 User Management</h1>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />

        <select value={role} onChange={handleRoleFilter} className="role-filter">
          <option value="">All Roles</option>
          <option value="client">Client</option>
          <option value="company">Company</option>
        </select>

        <span className="total-users">Total: {total} users</span>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
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
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.isActive ? 'active' : 'blocked'}`}>
                    {user.isActive ? '✓ Active' : '✗ Blocked'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="actions">
                    {user.isActive ? (
                      <button
                        className="btn-block"
                        onClick={() => setSelectedUser(user._id)}
                      >
                        Block
                      </button>
                    ) : (
                      <button
                        className="btn-unblock"
                        onClick={() => handleUnblockUser(user._id)}
                      >
                        Unblock
                      </button>
                    )}
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(user._id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="pagination-btn"
        >
          Previous
        </button>
        <span className="page-info">Page {page} of {totalPages}</span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
          className="pagination-btn"
        >
          Next
        </button>
      </div>

      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Block User</h2>
            <p>Provide a reason for blocking:</p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason for blocking..."
              className="block-reason-input"
            />
            <div className="modal-actions">
              <button
                className="btn-confirm"
                onClick={() => handleBlockUser(selectedUser)}
              >
                Block User
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setSelectedUser(null);
                  setBlockReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
