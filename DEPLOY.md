# 🚀 InterviewBot Deployment Guide

Complete step-by-step instructions to deploy your InterviewBot AI system to the cloud.

## 📋 Prerequisites

Before deploying, make sure you have:
- ✅ **Gemini API Key** from https://aistudio.google.com/apikey
- ✅ **GitHub account** and repository ready
- ✅ **Code pushed to GitHub**

### 🔑 Get Your Gemini API Key:
1. Go to https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Select "Create API key in new project"
5. Copy the key (starts with "AIza...")
6. Keep it safe - you'll need it for each deployment

---

## 🎯 Option 1: Railway (EASIEST - RECOMMENDED)

### ✅ Why Railway?
- **Free tier with PostgreSQL included**
- **Auto-detects your setup**
- **No configuration needed**
- **Easiest deployment process**

### 📝 Step-by-Step Instructions:

#### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Click **"Sign In"**
3. Choose **"Sign in with GitHub"**
4. Authorize Railway to access your GitHub

#### Step 2: Deploy Your Project
1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Find and select your **InterviewBot repository**
4. Click **"Deploy Now"**
5. Railway will automatically detect Node.js and start building

#### Step 3: Add PostgreSQL Database
1. In your project dashboard, click **"+ New"**
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Railway automatically creates `DATABASE_URL` and connects it

#### Step 4: Set Environment Variables
1. Click on your **web service** (not the database)
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add these one by one:

```
GEMINI_API_KEY=your_gemini_api_key_here
SESSION_SECRET=any-random-string-like-abc123xyz789
NODE_ENV=production
```

#### Step 5: Verify Deployment
1. Wait for build to complete (green checkmark)
2. Click on your service to see the **public URL**
3. Visit your live app!

**🎉 Your app is now live at: `https://yourapp.up.railway.app`**

---

## 🎯 Option 2: Render

### ✅ Why Render?
- **Free tier available**
- **Good for full-stack applications**
- **Automatic deployments from GitHub**

### 📝 Step-by-Step Instructions:

#### Step 1: Create Render Account
1. Go to https://render.com/
2. Click **"Get Started"**
3. Choose **"Sign up with GitHub"**
4. Authorize Render

#### Step 2: Create PostgreSQL Database
1. From dashboard, click **"New +"**
2. Select **"PostgreSQL"**
3. Fill in details:
   - **Name:** `interviewbot-db`
   - **Database:** `interview_ai`
   - **User:** `interview_user`
   - **Region:** Choose closest to you
   - **Plan:** **Free**
4. Click **"Create Database"**
5. **IMPORTANT:** Copy the **"External Database URL"** from the Info tab

#### Step 3: Create Web Service
1. Click **"New +"** again
2. Select **"Web Service"**
3. Connect your GitHub repository
4. Fill in settings:
   - **Name:** `interviewbot`
   - **Runtime:** `Node`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Plan:** **Free**

#### Step 4: Add Environment Variables
1. In your web service, go to **"Environment"** tab
2. Add these variables:

```
DATABASE_URL=your_copied_external_database_url_here
GEMINI_API_KEY=your_gemini_api_key_here
SESSION_SECRET=any-random-string-like-abc123xyz789
NODE_ENV=production
```

#### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait for build and deployment
3. Your app will be live at the provided URL

**🎉 Your app is now live at: `https://yourapp.onrender.com`**

---

## 🎯 Option 3: Fly.io

### ✅ Why Fly.io?
- **Free tier with good performance**
- **Uses Docker**
- **Global edge deployment**
- **Great for performance**

### 📝 Step-by-Step Instructions:

#### Step 1: Install Fly CLI
**Windows:**
```bash
# Using PowerShell
iwr https://fly.io/install.ps1 -useb | iex
```

**Mac:**
```bash
brew install flyctl
```

**Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Sign Up and Login
```bash
# Sign up for Fly.io account
fly auth signup

# Or login if you have account
fly auth login
```

#### Step 3: Launch Your App
1. **In your project folder**, run:
```bash
fly launch
```

2. **Answer the prompts:**
   - App name: `your-interviewbot-name`
   - Region: Choose closest to you
   - **PostgreSQL database:** **YES** ✅
   - **Deploy now:** **NO** (we need to set secrets first)

#### Step 4: Set Environment Variables
```bash
fly secrets set GEMINI_API_KEY=your_gemini_api_key_here
fly secrets set SESSION_SECRET=any-random-string-like-abc123xyz789
fly secrets set NODE_ENV=production
```

#### Step 5: Deploy
```bash
fly deploy
```

**🎉 Your app is now live at: `https://yourapp.fly.dev`**

---

## 🎯 Option 4: Heroku

### ✅ Why Heroku?
- **Classic platform**
- **Easy to use**
- **Good documentation**

### 📝 Step-by-Step Instructions:

#### Step 1: Create Heroku Account
1. Go to https://heroku.com/
2. Click **"Sign up"**
3. Create your account

#### Step 2: Create New App
1. From dashboard, click **"New"** → **"Create new app"**
2. Choose app name: `your-interviewbot-name`
3. Choose region
4. Click **"Create app"**

#### Step 3: Connect GitHub
1. Go to **"Deploy"** tab
2. Select **"GitHub"** as deployment method
3. Connect your GitHub account
4. Search and connect your repository
5. **Enable automatic deploys** if desired

#### Step 4: Add PostgreSQL Database
1. Go to **"Resources"** tab
2. In Add-ons search, type **"postgres"**
3. Select **"Heroku Postgres"**
4. Choose **"Hobby Dev - Free"** plan
5. Click **"Submit Order Form"**

#### Step 5: Set Environment Variables
1. Go to **"Settings"** tab
2. Click **"Reveal Config Vars"**
3. Add these variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
SESSION_SECRET=any-random-string-like-abc123xyz789
NODE_ENV=production
```

#### Step 6: Deploy
1. Go back to **"Deploy"** tab
2. Scroll to **"Manual deploy"**
3. Click **"Deploy Branch"**

**🎉 Your app is now live at: `https://yourapp.herokuapp.com`**

---

## 🎯 Option 5: Vercel (Advanced)

### ⚠️ **Important Note:**
Vercel requires significant code changes since it's serverless. Your current Express.js setup needs to be converted to Vercel API routes.

### 📝 Basic Steps (if you want to try):

#### Step 1: Create Vercel Account
1. Go to https://vercel.com/
2. Sign up with GitHub

#### Step 2: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 3: Deploy
```bash
vercel
```

**Note:** You'll need to restructure your backend to work with Vercel's serverless functions. This is complex and not recommended for beginners.

---

## 🔥 Platform Comparison

| Platform | Difficulty | Free Tier | Database | Best For |
|----------|------------|-----------|-----------|----------|
| **Railway** | 🟢 Very Easy | ✅ Yes | ✅ Included | **Beginners** |
| **Render** | 🟡 Easy | ✅ Yes | ✅ Separate | Full-stack apps |
| **Fly.io** | 🟡 Medium | ✅ Yes | ✅ Included | Performance |
| **Heroku** | 🟡 Medium | ✅ Yes | ✅ Add-on | Traditional |
| **Vercel** | 🔴 Hard | ✅ Yes | ❌ External | Static/Serverless |

## 🎯 **Recommendation: Start with Railway!**

Railway is the easiest option - it automatically detects your setup, includes PostgreSQL, and requires minimal configuration.

---

## 🔧 After Deployment - Testing Your App

### ✅ Verification Checklist:

1. **Visit your live URL**
2. **Create a new account** (test signup)
3. **Login with your account** (test authentication)
4. **Set up your profile** (add companies, roles)
5. **Try Subjective Interview mode** (text-based)
6. **Try Voice Interview mode** (speech recognition)
   - Allow microphone access
   - Speak clearly for best results
7. **Check AI responses** (make sure Gemini API works)
8. **View results and analytics**

### 🔍 If Something Goes Wrong:

#### Check Platform Logs:
- **Railway:** Click your service → "Logs" tab
- **Render:** Service dashboard → "Logs" tab  
- **Fly.io:** Run `fly logs`
- **Heroku:** Run `heroku logs --tail`

#### Common Issues:

**❌ "Internal Server Error"**
- Check environment variables are set correctly
- Verify Gemini API key is valid
- Check database connection

**❌ "Database connection failed"**
- Verify DATABASE_URL is set
- Check database service is running
- Try redeploying

**❌ "GEMINI_API_KEY not found"**
- Double-check the API key in environment variables
- Make sure there are no extra spaces
- Verify the key works in Google AI Studio

**❌ Voice recording doesn't work**
- This is normal - users need HTTPS and microphone permission
- All deployment platforms provide HTTPS automatically
- Test on your phone/different browser

---

## 🎉 Success!

Once deployed successfully, your InterviewBot will be live on the internet! Share the URL with friends and start getting AI-powered interview practice.

### 🔄 Updates and Changes

All platforms support automatic redeployment when you push changes to GitHub:

```bash
# Make changes to your code
git add .
git commit -m "Updated interview features"
git push origin main
# Your app automatically redeploys! 🚀
```

---

**💡 Need Help?** Check the platform-specific documentation or deployment logs for detailed error messages.

**🌟 Happy Deploying!** Your InterviewBot is ready to help people practice interviews worldwide! 🚀