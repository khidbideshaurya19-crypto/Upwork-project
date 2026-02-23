# MongoDB Atlas Setup Guide (5 minutes)

MongoDB Atlas is a free cloud database service that's perfect for your application.

## Step 1: Create Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with your email or Google account
3. Answer a few questions (select "I'm learning MongoDB")

## Step 2: Create Free Cluster

1. Choose **FREE** tier (M0 Sandbox)
2. Select a cloud provider (AWS, Google Cloud, or Azure)
3. Choose a region closest to you
4. Cluster Name: keep default or name it "MatchFlow"
5. Click **"Create Cluster"** (takes 3-5 minutes)

## Step 3: Create Database User

1. On the left sidebar, click **"Database Access"**
2. Click **"Add New Database User"**
3. Select **"Password"** authentication
4. Username: `matchflow_user`
5. Password: Click "Autogenerate Secure Password" or create your own
6. **⚠️ SAVE THIS PASSWORD** - you'll need it!
7. Database User Privileges: Select **"Read and write to any database"**
8. Click **"Add User"**

## Step 4: Whitelist IP Address

1. On the left sidebar, click **"Network Access"**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for development)
   - This adds 0.0.0.0/0
   - ⚠️ For production, use your server's IP instead
4. Click **"Confirm"**

## Step 5: Get Connection String

1. Go back to **"Database"** (left sidebar)
2. Click **"Connect"** on your cluster
3. Select **"Connect your application"**
4. Driver: **Node.js**
5. Version: **4.1 or later**
6. Copy the connection string. It looks like:
   ```
   mongodb+srv://matchflow_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Step 6: Update Your .env File

1. Open `backend\.env` in your text editor
2. Replace `<password>` with your actual database password
3. Add database name `/upwork` before the `?`
4. Final connection string should look like:
   ```
   MONGODB_URI=mongodb+srv://matchflow_user:YourPassword123@cluster0.xxxxx.mongodb.net/upwork?retryWrites=true&w=majority
   ```

Example:
```env
PORT=5000
MONGODB_URI=mongodb+srv://matchflow_user:MySecurePass123@cluster0.abc123.mongodb.net/upwork?retryWrites=true&w=majority
JWT_SECRET=supersecretkey12345changethisinproduction
NODE_ENV=development
```

## Step 7: Test Connection

1. Open terminal in `backend` folder
2. Run: `npm install`
3. Run: `npm run dev`
4. You should see:
   ```
   ✅ Connected to MongoDB
   ✅ Server running on port 5000
   📡 Socket.IO ready for real-time communication
   ```

## ✅ You're Done!

Your database is now:
- ✅ Hosted in the cloud (free forever for small apps)
- ✅ Automatically backed up
- ✅ Accessible from anywhere
- ✅ Production-ready
- ✅ Handles 512MB of data (plenty for testing)

## 📊 View Your Data

1. Go to https://cloud.mongodb.com
2. Click on your cluster
3. Click **"Collections"**
4. You'll see your data after using the app:
   - `users` - All clients and companies
   - `projects` - All job postings
   - `applications` - All job applications

## 💡 Pro Tips

- **Free tier includes**: 512MB storage, shared RAM, shared vCPU
- **Perfect for**: Development, testing, small production apps
- **Upgrade when**: You have 100+ concurrent users or 1GB+ data
- **Backup**: Automatically backed up by Atlas
- **Security**: Change password regularly for production

## 🔒 Production Security

When deploying:
1. Change the password
2. Update IP whitelist to your server IP only
3. Enable advanced security options
4. Use environment variables (never commit .env!)

## 🆘 Troubleshooting

### "Authentication failed"
- Double-check your password (no typos!)
- Make sure password doesn't have special characters like `@`, `:`, `/`
- If it does, URL-encode them

### "Network timeout"
- Check if 0.0.0.0/0 is in Network Access
- Check your internet connection
- Try a different region for your cluster

### "Cannot connect"
- Wait 5 minutes for cluster to fully deploy
- Refresh the connection string
- Make sure you added `/upwork` database name

---

**That's it! Your database is ready! 🎉**

Now run `start-all.bat` to start your application!
