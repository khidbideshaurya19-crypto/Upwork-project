# Quick Start Guide

## 🚀 Easy Development Setup

### Option 1: One-Click Start (Recommended for Windows)

**Double-click `start-dev.bat`** - This will start everything:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000 (handles both client & company)

### Option 2: Two Terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd app
npm start
```

### Option 3: Using npm scripts (from root)

```bash
# Start both backend + frontend
npm run dev

# Or start separately
npm run backend   # Terminal 1
npm run frontend  # Terminal 2
```

---

## 📝 Available Scripts

From the **root directory**:

| Command | Description |
|---------|-------------|
| `npm run backend` | Start backend only |
| `npm run frontend` | Start frontend only |
| `npm run dev` | Start backend + frontend together |
| `npm start` | Same as `npm run dev` |
| `npm run install-all` | Install dependencies for all |

---

## 🌐 Application URLs

- **Backend API:** http://localhost:5000
- **Frontend:** http://localhost:3000
  - Login as **client** → See client dashboard (post projects)
  - Login as **company** → See company dashboard (browse projects, chat)

**One frontend handles both roles automatically!**

---

## 🔧 First Time Setup

```bash
# Install all dependencies
npm run install-all

# Start development
npm run dev
```

Or simply double-click **`start-dev.bat`** on Windows!

---

## 💡 Tips

- Make sure MongoDB is running before starting backend
- The app automatically shows different dashboards based on user role
- Companies can chat with clients using the "Chat with Client" button
- Both client and company features are in the same app

---

**Enjoy coding!** 🎉
