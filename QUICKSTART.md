# Quick Start Guide - MatchFlow

## 🚀 Running the Application

Follow these steps in order to get your app running:

### Step 1: Setup Environment Variables

1. Create a `.env` file in the `backend` folder:
```bash
cd backend
copy .env.example .env
```

2. Edit `backend\.env` and add your MongoDB connection:
```
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/upwork
JWT_SECRET=your_super_secret_jwt_key_change_this
NODE_ENV=development
```

**To get MongoDB URI:**
- Go to https://www.mongodb.com/cloud/atlas
- Create a free account and cluster (takes 5 minutes)
- Click "Connect" → "Connect your application"
- Copy the connection string and replace `<password>` with your database password
- Replace `myFirstDatabase` with `upwork`

### Step 2: Install Dependencies

Open 3 separate terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
```

**Terminal 2 - Client App:**
```bash
cd client-app
npm install
```

**Terminal 3 - Company App:**
```bash
cd company-app
npm install
```

### Step 3: Start All Servers

**Terminal 1 - Start Backend:**
```bash
cd backend
npm run dev
```
✅ Backend will run on http://localhost:5000

**Terminal 2 - Start Client App:**
```bash
cd client-app
npm start
```
✅ Client app will open on http://localhost:3000

**Terminal 3 - Start Company App:**
```bash
cd company-app
npm start
```
✅ Company app will open on http://localhost:3001

## 📱 Testing the Application

### Test as Client (Browser 1):
1. Open http://localhost:3000
2. Click "Continue as Client"
3. Sign up with:
   - Name: John Doe
   - Email: john@client.com
   - Password: password123
   - Location: New York
4. Click "Post New Project"
5. Fill in project details and submit

### Test as Company (Browser 2 or Incognito):
1. Open http://localhost:3001
2. Click "Continue as Company"
3. Sign up with:
   - Name: Jane Smith
   - Email: jane@company.com
   - Company Name: Tech Solutions
   - Password: password123
4. You should see the project posted by John (real-time!)
5. Click on the project
6. Click "Apply to this Project"
7. Fill in quotation, cover letter, add files
8. Submit application

### Back to Client:
1. Go to Dashboard
2. Click on your project
3. You'll see Jane's application (real-time notification!)
4. Review the application
5. Click "Accept & Assign Work" or "Reject"

## 🔥 Key Features to Test

### Real-time Features:
- ✅ When client posts a project → Company sees it instantly
- ✅ When company applies → Client gets instant notification
- ✅ Status updates reflect in real-time

### File Uploads:
- Companies can upload PDF, DOC, DOCX, images
- Files are stored in `backend/uploads/`
- Clients can download and view files

### Authentication:
- Separate login for clients and companies
- JWT tokens with 7-day expiration
- Protected routes

## 🐛 Troubleshooting

### "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### "Cannot connect to MongoDB"
- Check your MongoDB URI in `.env`
- Make sure you whitelisted your IP in MongoDB Atlas
- Try using 0.0.0.0/0 to allow all IPs (development only!)

### "Module not found"
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Backend not starting
- Make sure MongoDB is connected
- Check if port 5000 is available
- Look for error messages in terminal

### Socket.IO not working
- Make sure backend is running first
- Check CORS settings
- Clear browser cache

## 📊 Database Collections

Your MongoDB database will have these collections:
- **users** - Stores clients and companies
- **projects** - Stores job postings
- **applications** - Stores job applications

You can view them in MongoDB Compass or Atlas UI.

## 🎯 Next Steps

1. **Customize the UI** - Edit CSS files in `src/pages/`
2. **Add more features** - Messages, reviews, payments
3. **Deploy** - Follow README.md deployment section
4. **Add search/filters** - Enhance the browse experience

## 💡 Tips

- Use different browsers or incognito mode to test client & company simultaneously
- Check browser console for errors
- Check terminal for backend logs
- MongoDB Atlas free tier is enough for testing

## 📞 Need Help?

- Check README.md for detailed documentation
- Look at backend routes in `backend/routes/`
- Check API responses in browser DevTools
- Verify environment variables are set correctly

---

**You're all set! Start building your freelance marketplace! 🚀**
