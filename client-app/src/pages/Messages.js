import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import './Messages.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeConversationIdRef = useRef(conversationId || null);

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    fetchConversations();
    setupSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    activeConversationIdRef.current = conversationId || null;
    if (conversationId) {
      fetchConversation(conversationId);
    } else {
      setActiveConversation(null);
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupSocket = () => {
    if (!currentUser) return;

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.emit('join', {
      userId: currentUser.id,
      role: currentUser.role
    });

    socketRef.current.on('newMessage', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        setMessages(prev => {
          if (prev.some(msg => msg._id === data.message._id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }
      fetchConversations();
    });

    socketRef.current.on('messagesRead', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        setMessages(prev => prev.map(msg => 
          msg.sender._id === currentUser.id ? { ...msg, status: 'read' } : msg
        ));
      }
    });

    socketRef.current.on('messageDeleted', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
      }
      fetchConversations();
    });

    socketRef.current.on('conversationDeleted', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        navigate('/messages');
      }
      fetchConversations();
    });

    socketRef.current.on('chatCleared', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        setMessages([]);
      }
      fetchConversations();
    });

    socketRef.current.on('conversationStarted', () => {
      fetchConversations();
    });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchConversation = async (convId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/messages/conversation/${convId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveConversation(response.data.conversation);
      setMessages(response.data.messages);
      
      await axios.put(`${API_URL}/messages/conversation/${convId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchConversations();
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && attachments.length === 0) return;
    
    try {
      setSending(true);
      const formData = new FormData();
      formData.append('content', newMessage);
      
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await axios.post(
        `${API_URL}/messages/conversation/${conversationId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      setAttachments([]);
      setSending(false);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(files);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((sum, conv) => sum + conv.unreadCountClient, 0);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return <span className="read-tick">✓✓</span>;
      default:
        return '';
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await axios.delete(`${API_URL}/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(messages.filter(msg => msg._id !== messageId));
      setSelectedMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm('Delete this entire conversation? This cannot be undone.')) return;

    try {
      await axios.delete(`${API_URL}/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/messages');
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear all messages in this chat? This cannot be undone.')) return;

    try {
      await axios.delete(`${API_URL}/messages/conversation/${conversationId}/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat');
    }
  };

  return (
    <>
      <Navbar />
      <div className="messages-container">
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2>Messages</h2>
            {getTotalUnreadCount() > 0 && (
              <span className="total-unread-badge">{getTotalUnreadCount()}</span>
            )}
          </div>
          <div className="conversations-list">
            {conversations.map(conv => (
              <div
                key={conv._id}
                className={`conversation-item ${conv._id === conversationId ? 'active' : ''}`}
                onClick={() => navigate(`/messages/${conv._id}`)}
              >
                <div className="conv-avatar">
                  {conv.company.companyName.charAt(0).toUpperCase()}
                </div>
                <div className="conv-details">
                  <div className="conv-header">
                    <h4>{conv.company.companyName}</h4>
                    {conv.lastMessage && (
                      <span className="conv-time">
                        {formatTime(conv.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <div className="conv-footer">
                    <p className="conv-project">{conv.project.title}</p>
                    {conv.unreadCountClient > 0 && (
                      <span className="unread-badge">{conv.unreadCountClient}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="no-conversations">
                <p>No conversations yet</p>
                <p>Accept an application to start messaging</p>
              </div>
            )}
          </div>
        </div>

        <div className="chat-panel">
          {activeConversation ? (
            <>
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-avatar">
                    {activeConversation.company.companyName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{activeConversation.company.companyName}</h3>
                    <p className="chat-project">{activeConversation.project.title}</p>
                  </div>
                </div>
                <div className="chat-header-actions">
                  <button 
                    className="menu-btn" 
                    onClick={() => setShowConversationMenu(!showConversationMenu)}
                  >
                    ⋮
                  </button>
                  {showConversationMenu && (
                    <div className="dropdown-menu">
                      <button onClick={handleClearChat}>Clear Chat History</button>
                      <button onClick={handleDeleteConversation} className="danger">Delete Conversation</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="messages-list">
                {loading ? (
                  <div className="loading">Loading messages...</div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <div
                        key={msg._id}
                        className={`message ${msg.sender._id === currentUser.id ? 'sent' : 'received'}`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (msg.sender._id === currentUser.id) {
                            setSelectedMessageId(selectedMessageId === msg._id ? null : msg._id);
                          }
                        }}
                      >
                        <div className="message-bubble">
                          {msg.sender._id === currentUser.id && selectedMessageId === msg._id && (
                            <button 
                              className="delete-message-btn" 
                              onClick={() => handleDeleteMessage(msg._id)}
                              title="Delete message"
                            >
                              🗑️
                            </button>
                          )}
                          <p className="message-content">{msg.content}</p>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="message-attachments">
                              {msg.attachments.map((file, idx) => (
                                <div key={idx} className="attachment-item">
                                  📎 {file.originalName}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="message-footer">
                            <span className="message-time">{formatTime(msg.createdAt)}</span>
                            {msg.sender._id === currentUser.id && (
                              <span className="message-status">{getStatusIcon(msg.status)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <form className="message-input-container" onSubmit={handleSendMessage}>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <button
                  type="button"
                  className="attach-btn"
                  onClick={() => fileInputRef.current.click()}
                >
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <button type="submit" disabled={sending || (!newMessage.trim() && attachments.length === 0)}>
                  {sending ? '⏳' : '📤'}
                </button>
                {attachments.length > 0 && (
                  <div className="selected-files">
                    {attachments.map((file, idx) => (
                      <span key={idx} className="file-tag">{file.name}</span>
                    ))}
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <h3>Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Messages;
