# How to Fix the Application Crashes

## Problem
Your applications are crashing because **OneDrive is corrupting the `node_modules` folder**. OneDrive creates "reparse points" (special file links) that don't work well with Node.js modules.

## Error Message
```
Error: Cannot find module 'C:\Users\Admin\OneDrive\Desktop\upwork\client-app\node_modules\@babel\plugin-transform-private-methods\lib\index.js'
The tag present in the reparse point buffer is invalid.
```

## Solution 1: Move Project Outside OneDrive (RECOMMENDED)

### Step 1: Copy the project to a location outside OneDrive
```powershell
# Open PowerShell as Administrator
# Copy project files (excluding node_modules and .git)
xcopy "C:\Users\Admin\OneDrive\Desktop\upwork" "C:\Projects\upwork" /E /I /EXCLUDE:node_modules
```

### Step 2: Navigate to new location and install dependencies
```powershell
cd C:\Projects\upwork

# Install backend
cd backend
npm install
node server.js

# Install client-app (in new terminal)
cd C:\Projects\upwork\client-app
npm install
npm start

# Install company-app (in new terminal)
cd C:\Projects\upwork\company-app
npm install
npm start
```

## Solution 2: Exclude node_modules from OneDrive Sync

### Method A: Using OneDrive Settings
1. Right-click OneDrive icon in system tray
2. Click "Settings"
3. Go to "Sync and backup" > "Advanced settings"
4. Add `node_modules` to excluded folders

### Method B: Using .gitignore style file
Create a file at the root of your OneDrive folder called `.odignore` and add:
```
node_modules/
```

### Step 3: After excluding, delete and reinstall node_modules
```powershell
# Stop OneDrive sync temporarily
# Then in PowerShell:

cd "C:\Users\Admin\OneDrive\Desktop\upwork\client-app"
rmdir /s /q node_modules
npm install

cd "C:\Users\Admin\OneDrive\Desktop\upwork\company-app"
rmdir /s /q node_modules
npm install
```

## Solution 3: Quick Fix with CMD (Not PowerShell)

OneDrive issues sometimes work better with CMD:

```cmd
REM Open CMD (not PowerShell)
cd C:\Users\Admin\OneDrive\Desktop\upwork\client-app
rmdir /s /q node_modules
npm install
npm start

REM In another CMD window
cd C:\Users\Admin\OneDrive\Desktop\upwork\company-app
rmdir /s /q node_modules
npm install
npm start
```

## Current Status

✅ **Backend** - Working correctly (running on port 5000)
❌ **Client-app** - Crashing due to corrupted node_modules
❌ **Company-app** - Crashing due to corrupted node_modules

## Why This Happens

OneDrive uses "placeholder" files for cloud-synced content. When npm creates thousands of small files in `node_modules`, OneDrive's sync mechanism creates reparse points (symbolic links) that Node.js cannot properly read, causing the "invalid tag in reparse point buffer" error.

## Best Practice

**Never put `node_modules` in cloud-synced folders** (OneDrive, Dropbox, Google Drive, iCloud). Always:
- Keep your source code in cloud storage
- Keep `node_modules` local only
- Add `node_modules/` to `.gitignore` (already done)
- Install dependencies locally on each machine
