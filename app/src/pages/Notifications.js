import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications?limit=50');
      setNotifications(res.data.notifications || []);
    } catch (error) {
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const parseDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const dt = new Date(dateValue);
    return Number.isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleString();
  };

  const markOneRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications((prev) => prev.map((item) =>
        item._id === notificationId ? { ...item, isRead: true, readAt: new Date().toISOString() } : item
      ));
    } catch (error) {
      console.error('Mark notification read error:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date().toISOString() })));
    } catch (error) {
      console.error('Mark all notifications read error:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="notifications-container">
        <div className="notifications-header">
          <div>
            <h1>Notifications</h1>
            <p>{notifications.length} total · {unreadCount} unread</p>
          </div>
          <button className="notifications-mark-all" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all as read
          </button>
        </div>

        {loading ? (
          <div className="notifications-empty">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">No notifications yet.</div>
        ) : (
          <div className="notifications-list">
            {notifications.map((item) => (
              <div key={item._id} className={`notification-item ${item.isRead ? 'is-read' : 'is-unread'}`}>
                <div className="notification-main" onClick={() => {
                  if (!item.isRead) markOneRead(item._id);
                  if (item.link) navigate(item.link);
                }}>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                  <span>{parseDate(item.createdAt)}</span>
                </div>
                {!item.isRead && (
                  <button className="notification-read-btn" onClick={() => markOneRead(item._id)}>
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
