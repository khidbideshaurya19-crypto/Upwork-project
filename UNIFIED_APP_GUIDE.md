# MatchFlow - Unified Application Guide

## Overview
The MatchFlow application now has a unified entry point with a beautiful landing page. Users first see the marketing website, then can choose their role (Client or Company) before signing up.

## User Flow

### Step 1: Landing Page (`/`)
When you visit the main application, you'll see:
- Beautiful marketing website with features and pricing
- "Get Started Free" button in the navbar
- "Sign In" button for existing users
- Multiple call-to-action buttons throughout the page

### Step 2: Role Selection (`/get-started`)
When users click any "Get Started" button, they see:

1. **Continue as Client** - For users who want to:
   - Post projects
   - Hire companies
   - Manage project requirements
   - Track deliverables

2. **Continue as Company** - For users who want to:
   - Browse available projects
   - Apply for work
   - Manage applications
   - Grow their business

### Step 3: Signup/Login
- Each role selection takes users to signup with the role pre-selected
- Users can also click "Login" if they already have an account

## Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Landing Page (/)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  • Hero Section with Call-to-Action                 │   │
│  │  • Features & Benefits                              │   │
│  │  • How It Works                                     │   │
│  │  • Pricing Plans                                    │   │
│  │  • Navbar: [Sign In] [Get Started Free]            │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────┬────────────────────────────────┬───────────────┘
             │ Click "Get Started"            │ Click "Sign In"
             ▼                                ▼
┌─────────────────────────────┐   ┌──────────────────────────┐
│  Role Selection             │   │   Login Page             │
│  (/get-started)             │   │   (/login)               │
│  ┌─────────────────────┐   │   │  • Choose Role Tab       │
│  │ Continue as Client  │   │   │  • Client/Company/Admin  │
│  │  ✓ Post Projects    │   │   │  • Email & Password      │
│  │  ✓ Hire Companies   │   │   └──────────────────────────┘
│  └─────────────────────┘   │                │
│  ┌─────────────────────┐   │                ▼
│  │ Continue as Company │   │   ┌──────────────────────────┐
│  │  ✓ Browse Projects  │   │   │  Dashboard               │
│  │  ✓ Apply for Work   │   │   │  (Role-based routing)    │
│  └─────────────────────┘   │   └──────────────────────────┘
└──────────┬──────────────────┘
           │ Select Role
           ▼
┌─────────────────────────────┐
│  Signup Page                │
│  (/signup?role=...)         │
│  • Pre-selected Role        │
│  • Name, Email, Password    │
│  • Company Info (if company)│
└──────────┬──────────────────┘
           │ Complete Signup
           ▼
┌─────────────────────────────┐
│  Dashboard                  │
│  (Smart routing by role)    │
│  • Client → Project Posting │
│  • Company → Browse Projects│
└─────────────────────────────┘
```


## Starting the Application

### Option 1: Start Everything (Recommended)
```bash
start-unified.bat
```
This will start:
- Backend Server (Port 5000)
- Main Application (Port 3000) with role selection

### Option 2: Start Components Separately

**Start Backend:**
```bash
start-backend.bat
```

**Start Main App:**
```bash
start-main.bat
```

## Application Flow

1. **Landing Page** (`/`)
   - Marketing website with features, pricing, and testimonials
   - "Get Started" and "Sign In" buttons
   - Beautiful hero section with call-to-action

2. **Role Selection** (`/get-started`)
   - Clean interface with two role options
   - "Continue as Client" or "Continue as Company"
   - Feature highlights for each role

3. **Signup** (`/signup?role=client` or `/signup?role=company`)
   - Pre-selected role based on your choice
   - Can switch roles during signup
   - Different fields for clients vs companies

4. **Login** (`/login`)
   - Choose role: Client, Company, or Admin
   - Single login page for all user types

5. **Dashboard** (`/dashboard`)
   - Smart routing based on user role
   - Clients see project posting interface
   - Companies see project browsing interface

## Features

### For Clients:
- ✓ Post unlimited projects
- ✓ AI-powered company matching
- ✓ Secure milestone payments
- ✓ Quality assurance tracking

### For Companies:
- ✓ Access to verified projects
- ✓ Trust-based ranking system
- ✓ Easy application management
- ✓ Growth analytics

## Technical Changes

### File Structure:
```
client-app/
  src/
    pages/
      RoleSelection.js     # New unified landing page
      RoleSelection.css    # Styling for role selection
      Landing.js           # Original client landing (kept for reference)
      ...
```

### Key Updates:
1. **App.js** - Routes updated:
   - `/` → Landing page (marketing website)
   - `/get-started` → Role selection (choose client/company)
   - `/signup` → Accepts `?role=client` or `?role=company` parameter

2. **Landing.js** - Enhanced:
   - All "Get Started" buttons redirect to `/get-started`
   - "Sign In" button goes to `/login`
   - Marketing content with features, pricing, and CTAs

3. **Signup.js** - Enhanced:
   - Reads role from URL parameter
   - Pre-selects the role automatically
   - Can still switch roles manually

## Port Configuration

- **Backend**: `http://localhost:5000`
- **Main App**: `http://localhost:3000`
- **MongoDB**: `mongodb://localhost:27017/upwork`

## Prerequisites

Before starting the application:

1. **MongoDB** must be running
   ```bash
   mongod
   ```

2. **Dependencies** must be installed:
   ```bash
   # Backend
   cd backend
   npm install

   # Client App
   cd client-app
   npm install
   ```

## Environment Variables

Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/upwork
JWT_SECRET=your_secret_key_here
```

## Admin Access

To access the admin panel:
1. Go to `/login`
2. Select "Admin" tab
3. Use default credentials:
   - Email: `admin@upwork.com`
   - Password: `Admin@123456`

## Troubleshooting

### Port Already in Use
If you see "Port 3000 is already in use":
```bash
# Find and kill the process using the port
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

### MongoDB Connection Error
Ensure MongoDB is running:
```bash
mongod --dbpath="C:\data\db"
```

### Dependencies Issues
Clear cache and reinstall:
```bash
cd client-app
rmdir /s /q node_modules
del package-lock.json
npm install
```

## Development Notes

- The original separate `company-app` folder is still available but no longer needed
- Both client and company functionality now run through the unified `client-app`
- The role selection happens at the landing page, making it seamless for users
- Backend handles both client and company roles automatically

## Next Steps

Future enhancements could include:
- Admin panel accessible from role selection
- Guest browsing mode
- Enhanced analytics dashboard
- Mobile responsive improvements

---

**For more information, see:**
- [Getting Started](GETTING_STARTED.md)
- [Project Overview](PROJECT_OVERVIEW.md)
- [MongoDB Setup](MONGODB_SETUP.md)
