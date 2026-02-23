# Upwork-Like Platform - MatchFlow

A full-stack freelance marketplace platform similar to Upwork, featuring real-time communication between clients and companies.

## 🚀 Tech Stack

### Backend
- Node.js & Express.js
- MongoDB (Database)
- Socket.IO (Real-time communication)
- JWT (Authentication)
- Multer (File uploads)

### Frontend
- React.js (Separate apps for Client and Company)
- React Router (Navigation)
- Axios (API requests)
- Socket.IO Client (Real-time updates)

## 📁 Project Structure

```
upwork/
├── backend/                 # Node.js Express server
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── middleware/         # Auth & file upload middleware
│   └── server.js           # Server entry point
├── client-app/             # React app for Clients
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── context/       # Auth context
│   │   ├── utils/         # API utilities
│   │   └── components/    # Reusable components
└── company-app/            # React app for Companies
    └── src/               # Similar structure to client-app
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB Atlas account (free tier) OR local MongoDB

### Step 1: MongoDB Setup

#### Option A: MongoDB Atlas (Recommended for Production)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Get your connection string
4. It will look like: `mongodb+srv://username:password@cluster.mongodb.net/upwork`

#### Option B: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/upwork`

### Step 2: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
copy .env.example .env

# Edit .env file with your MongoDB URI and JWT secret
# PORT=5000
# MONGODB_URI=your_mongodb_connection_string
# JWT_SECRET=your_super_secret_jwt_key
# NODE_ENV=development

# Start the backend server
npm run dev
```

The backend will start on `http://localhost:5000`

### Step 3: Client App Setup

```bash
# Open a new terminal
# Navigate to client-app folder
cd client-app

# Install dependencies (if not already installed)
npm install

# Start the client app
npm start
```

The client app will start on `http://localhost:3000`

### Step 4: Company App Setup

```bash
# Open another new terminal
# Navigate to company-app folder
cd company-app

# Install dependencies (if not already installed)
npm install

# Start the company app
npm start
```

The company app will start on `http://localhost:3001`

## 🎯 Features

### Client Features
- ✅ Signup/Login as Client
- ✅ Post unlimited projects
- ✅ View all applications received
- ✅ Accept/Reject applications
- ✅ Real-time notifications when companies apply
- ✅ Project management dashboard
- ✅ View company profiles and ratings

### Company Features
- ✅ Signup/Login as Company
- ✅ Browse available projects
- ✅ Apply to projects with quotation
- ✅ Upload supporting documents (PDF, Word, Images)
- ✅ Add portfolio links
- ✅ Real-time notifications for new projects
- ✅ Track application status
- ✅ Company dashboard with statistics

### Real-time Features (Socket.IO)
- 🔔 Companies get notified instantly when clients post new projects
- 🔔 Clients get notified instantly when companies apply to their projects
- 🔔 Application status updates in real-time

## 📱 Usage Guide

### For Clients

1. **Signup/Login**
   - Visit `http://localhost:3000`
   - Click "Continue as Client"
   - Fill in your details and signup

2. **Post a Project**
   - After logging in, click "Post New Project"
   - Fill in project details: title, description, budget, skills, etc.
   - Submit the project

3. **View Applications**
   - Go to Dashboard
   - Click on any project to view applications
   - Review company proposals, quotations, and attachments
   - Accept or reject applications

### For Companies

1. **Signup/Login**
   - Visit `http://localhost:3001`
   - Click "Continue as Company"
   - Fill in company details and signup

2. **Browse Projects**
   - View all available projects on the dashboard
   - Filter by category, budget, etc.

3. **Apply to Projects**
   - Click on a project
   - Fill in your quotation and cover letter
   - Upload supporting documents
   - Add portfolio links
   - Submit application

4. **Track Applications**
   - View all your applications in "My Applications"
   - Get notified when status changes

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Projects (Client)
- `POST /api/projects` - Create project
- `GET /api/projects` - Get all projects
- `GET /api/projects/my-projects` - Get client's projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Applications (Company)
- `POST /api/applications/:projectId` - Apply to project
- `GET /api/applications/my-applications` - Get company's applications
- `GET /api/applications/project/:projectId` - Get project applications (Client only)
- `PUT /api/applications/:id/status` - Accept/Reject application (Client only)
- `DELETE /api/applications/:id` - Withdraw application

## 🚀 Deployment

### Backend Deployment (Heroku/Render)

```bash
# Add to package.json engines
{
  "engines": {
    "node": "18.x"
  }
}

# Create Procfile
web: node server.js

# Deploy to Heroku or Render
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build the apps
cd client-app && npm run build
cd company-app && npm run build

# Deploy to Vercel or Netlify
# Update environment variables with production API URLs
```

### Environment Variables for Production

**Backend:**
- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Strong secret key
- `NODE_ENV` - production
- `PORT` - 5000 (or as assigned by hosting)

**Frontend:**
- `REACT_APP_API_URL` - Your deployed backend URL
- `REACT_APP_SOCKET_URL` - Your deployed backend URL

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Protected API routes
- File upload validation
- CORS configuration
- Input validation with express-validator

## 📝 Database Schema

### User Model
- name, email, password (hashed)
- role (client/company)
- companyName, description (for companies)
- rating, jobsCompleted, verified status

### Project Model
- title, description, category
- budget, budgetType (fixed/hourly)
- skills array
- status (open/in-progress/completed/closed)
- client reference
- applicantsCount

### Application Model
- project reference
- company reference
- quotation, coverLetter
- estimatedDuration
- attachments array
- portfolioLinks array
- status (pending/accepted/rejected)

## 🤝 Contributing

Feel free to fork this project and submit pull requests!

## 📄 License

MIT License

## 👨‍💻 Author

Built with ❤️ for the freelance community

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill the process using the port
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### MongoDB Connection Error
- Check your MongoDB URI in `.env`
- Ensure IP address is whitelisted in MongoDB Atlas
- Verify network connection

### Socket.IO Not Working
- Check CORS configuration in backend
- Verify Socket.IO URL in frontend `.env`
- Check browser console for errors

## 📞 Support

For issues and questions, create an issue on GitHub or contact support.

---

Happy Coding! 🚀
