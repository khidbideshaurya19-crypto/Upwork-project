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
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showMessageMenu, setShowMessageMenu] = useState(null);
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

    socketRef.current.on('messageEdited', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.message._id ? data.message : msg
        ));
      }
    });

    socketRef.current.on('messageStatusUpdate', (data) => {
      if (String(data.conversationId) === String(activeConversationIdRef.current)) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId ? { ...msg, status: data.status } : msg
        ));
      }
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

      // Don't add message here - socket will handle it
      setNewMessage('');
      setAttachments([]);
      setSending(false);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId) => {
    if (!editContent.trim()) {
      alert('Message cannot be empty');
      return;
    }

    try {
      const response = await axios.put(
        `${API_URL}/messages/${messageId}`,
        { content: editContent },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data.message : msg
      ));
      
      setEditingMessageId(null);
      setEditContent('');
      setShowMessageMenu(null);
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message');
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
      setShowMessageMenu(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(files);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date) => {
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const messageDate = parseDate(date);
    if (!messageDate) return 'Just now';

    const now = new Date();
    const diffTime = Math.abs(now - messageDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return messageDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
      case 'sent':
        return <span className="status-icon sent">✓</span>;
      case 'delivered':
        return <span className="status-icon delivered">✓✓</span>;
      case 'read':
        return <span className="status-icon read">✓✓</span>;
      default:
        return '';
    }
  };

  const getTotalUnreadCount = () => {
    if (currentUser.role === 'client') {
      return conversations.reduce((sum, conv) => sum + (conv.unreadCountClient || 0), 0);
    } else {
      return conversations.reduce((sum, conv) => sum + (conv.unreadCountCompany || 0), 0);
    }
  };

  const getConversationName = (conv) => {
    if (currentUser.role === 'client') {
      return conv.company?.companyName || conv.company?.name || 'Company';
    } else {
      return conv.client?.name || 'Client';
    }
  };

  const getConversationAvatar = (conv) => {
    const isClient = currentUser.role === 'client';
    const otherUser = isClient ? conv.company : conv.client;
    
    console.log('Avatar check:', { otherUser, profileImage: otherUser?.profileImage });
    
    if (otherUser?.profileImage) {
      return (
        <img 
          src={otherUser.profileImage.startsWith('http') ? otherUser.profileImage : `http://localhost:5000${otherUser.profileImage}`} 
          alt="Profile" 
          className="conv-avatar-img"
        />
      );
    }
    
    const name = getConversationName(conv);
    return name.charAt(0).toUpperCase();
  };

  return (
    <>
      <Navbar />
      <div className="messages-container whatsapp-style">
        {/* Left Sidebar - Conversations List */}
        <div className="conversations-sidebar">
          <div className="sidebar-header">
            <h2>Messages</h2>
            {getTotalUnreadCount() > 0 && (
              <span className="total-unread-badge">{getTotalUnreadCount()}</span>
            )}
          </div>
          
          <div className="conversations-list">
            {conversations.map(conv => {
              const unreadCount = currentUser.role === 'client' 
                ? conv.unreadCountClient 
                : conv.unreadCountCompany;
              
              return (
                <div
                  key={conv._id}
                  className={`conversation-item ${conv._id === conversationId ? 'active' : ''}`}
                  onClick={() => navigate(`/messages/${conv._id}`)}
                >
                  <div className="conv-avatar">
                    {getConversationAvatar(conv)}
                  </div>
                  <div className="conv-details">
                    <div className="conv-header">
                      <h4>{getConversationName(conv)}</h4>
                      {conv.lastMessageTime && (
                        <span className="conv-time">
                          {formatTime(conv.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="conv-footer">
                      <p className="conv-project">All Projects</p>
                      {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {conversations.length === 0 && (
              <div className="no-conversations">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <p>No conversations yet</p>
                <p className="subtext">Start chatting from project posts</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chat Area */}
        <div className="chat-panel">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-avatar">
                    {getConversationAvatar(activeConversation)}
                  </div>
                  <div>
                    <h3>{getConversationName(activeConversation)}</h3>
                    <p className="chat-project">Discussing Projects</p>
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
                      <button onClick={() => {
                        setShowConversationMenu(false);
                        handleClearChat();
                      }}>
                        🗑️ Clear Chat History
                      </button>
                      <button onClick={() => {
                        setShowConversationMenu(false);
                        handleDeleteConversation();
                      }} className="danger">
                        ❌ Delete Conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages List */}
              <div className="messages-list">
                {loading ? (
                  <div className="loading">Loading messages...</div>
                ) : (
                  <>
                    {messages.map(msg => {
                      const isSent = msg.sender._id === currentUser.id;
                      const isEditing = editingMessageId === msg._id;

                      return (
                        <div
                          key={msg._id}
                          className={`message ${isSent ? 'sent' : 'received'}`}
                        >
                          <div className="message-bubble">
                            {isEditing ? (
                              <div className="message-edit-form">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      handleEditMessage(msg._id);
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="edit-actions">
                                  <button 
                                    className="btn-save" 
                                    onClick={() => handleEditMessage(msg._id)}
                                  >
                                    Save
                                  </button>
                                  <button 
                                    className="btn-cancel" 
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditContent('');
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="message-content">
                                  {msg.content}
                                  {msg.isEdited && (
                                    <span className="edited-label"> (edited)</span>
                                  )}
                                </p>
                                
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
                                  {isSent && (
                                    <span className="message-status">{getStatusIcon(msg.status)}</span>
                                  )}
                                </div>

                                {/* Message Menu for sent messages */}
                                {isSent && (
                                  <div className="message-menu-trigger">
                                    <button
                                      className="message-menu-btn"
                                      onClick={() => setShowMessageMenu(showMessageMenu === msg._id ? null : msg._id)}
                                    >
                                      ▼
                                    </button>
                                    {showMessageMenu === msg._id && (
                                      <div className="message-dropdown-menu">
                                        <button onClick={() => {
                                          setEditingMessageId(msg._id);
                                          setEditContent(msg.content);
                                          setShowMessageMenu(null);
                                        }}>
                                          ✏️ Edit
                                        </button>
                                        <button onClick={() => handleDeleteMessage(msg._id)} className="danger">
                                          🗑️ Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <form className="message-input-container" onSubmit={handleSendMessage}>
                {attachments.length > 0 && (
                  <div className="selected-files">
                    {attachments.map((file, idx) => (
                      <span key={idx} className="file-tag">
                        {file.name}
                        <button
                          type="button"
                          onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="input-row">
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
                    title="Attach file"
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
                  <button 
                    type="submit" 
                    className="send-btn"
                    disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                  >
                    {sending ? '⏳' : '📤'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="no-chat-selected">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
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
