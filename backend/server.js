const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Firebase / Firestore BEFORE any routes
require('./firebase');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Make io accessible to routes
app.set('io', io);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // User joins their own room based on role and ID
  socket.on('join', (data) => {
    const { userId, role } = data;
    const room = `${role}-${userId}`;
    socket.join(room);
    console.log(`User ${userId} joined room: ${room}`);
  });

  // Company subscribes to new projects
  socket.on('subscribeToProjects', () => {
    socket.join('projects-feed');
    console.log('Client subscribed to projects feed');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/search', require('./routes/search'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin/auth', require('./routes/admin-auth'));
app.use('/api/admin', require('./routes/admin'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server directly — Firebase initializes lazily
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log('\u2705 Firebase / Firestore initialized');
  console.log(`\u2705 Server running on port ${PORT}`);
  console.log('\uD83D\uDCE1 Socket.IO ready for real-time communication');
});


// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});
