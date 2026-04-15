# 🚀 Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

### 1. Code Preparation
- [ ] All code is committed to Git
- [ ] Code is pushed to GitHub/GitLab/Bitbucket
- [ ] No sensitive data in code (API keys, passwords, etc.)
- [ ] `.env.local` is in `.gitignore` (already done)

### 2. Database Setup
- [ ] Run `database/schema.sql` in Supabase
- [ ] Run `database/lti-oneroster-schema.sql` in Supabase
- [ ] Run `database/proctoring-plagiarism-questionbanks-schema.sql` in Supabase
- [ ] Run `database/analytics-notifications-schema.sql` in Supabase
- [ ] Verify all tables are created
- [ ] Test database connections

### 3. Environment Variables
Prepare these values to add in Vercel:

#### Supabase (Required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET`

#### PostgreSQL (Required)
- [ ] `POSTGRES_URL`
- [ ] `POSTGRES_URL_NON_POOLING`
- [ ] `POSTGRES_PRISMA_URL`
- [ ] `POSTGRES_HOST`
- [ ] `POSTGRES_USER`
- [ ] `POSTGRES_PASSWORD`
- [ ] `POSTGRES_DATABASE`

#### Email (Required for notifications)
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `NEXT_PUBLIC_APP_URL` (will be your Vercel URL)

#### Optional Services
- [ ] `TWILIO_ACCOUNT_SID` (if using SMS)
- [ ] `TWILIO_AUTH_TOKEN` (if using SMS)
- [ ] `FIREBASE_SERVER_KEY` (if using Push)
- [ ] `OPENAI_API_KEY` (if using AI features)
- [ ] `STRIPE_SECRET_KEY` (if using payments)

## Deployment Steps

### Step 1: Create Vercel Account
- [ ] Sign up at https://vercel.com
- [ ] Connect your Git provider (GitHub/GitLab/Bitbucket)

### Step 2: Import Project
- [ ] Click "Add New Project"
- [ ] Select your repository
- [ ] Vercel auto-detects Next.js

### Step 3: Configure Project
- [ ] Framework: Next.js (auto-detected)
- [ ] Root Directory: `./` (default)
- [ ] Build Command: `npm run build` (default)
- [ ] Output Directory: `.next` (default)
- [ ] Install Command: `npm install` (default)

### Step 4: Add Environment Variables
- [ ] Go to Settings → Environment Variables
- [ ] Add all variables from checklist above
- [ ] Set for: Production, Preview, Development
- [ ] Click "Save"

### Step 5: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete
- [ ] Check build logs for errors

## Post-Deployment

### 1. Verify Deployment
- [ ] Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
- [ ] Site loads without errors
- [ ] Test authentication (sign in/sign up)
- [ ] Test key features (courses, quizzes, etc.)

### 2. Database Configuration
- [ ] Run notification channels setup:
  ```sql
  \i database/configure-notification-channels.sql
  ```
- [ ] Run data warehouse setup:
  ```sql
  \i database/configure-data-warehouses.sql
  ```

### 3. Update URLs
- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel to your actual domain
- [ ] Update any webhook URLs
- [ ] Update Supabase redirect URLs if using OAuth

### 4. Custom Domain (Optional)
- [ ] Add custom domain in Vercel Settings → Domains
- [ ] Configure DNS records
- [ ] Wait for SSL certificate (automatic)
- [ ] Update `NEXT_PUBLIC_APP_URL` to custom domain

### 5. Monitoring Setup
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure uptime monitoring

## Testing Checklist

### Authentication
- [ ] User can sign up
- [ ] User can sign in
- [ ] Password reset works
- [ ] Email verification works

### Core Features
- [ ] Courses load and display
- [ ] Users can enroll in courses
- [ ] Lessons can be viewed
- [ ] Quizzes can be taken
- [ ] Assignments can be submitted
- [ ] Grades are displayed

### Admin Features
- [ ] Admin dashboard loads
- [ ] User management works
- [ ] Course creation works
- [ ] Analytics display correctly

### Notifications
- [ ] Email notifications send
- [ ] In-app notifications work
- [ ] SMS/WhatsApp/Push (if configured)

## Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all dependencies in `package.json`
- Check for TypeScript errors
- Verify environment variables are set

### Runtime Errors
- Check function logs in Vercel
- Verify database connections
- Check Supabase RLS policies
- Verify API routes are working

### Performance Issues
- Enable Vercel Analytics
- Check Core Web Vitals
- Optimize images
- Enable caching

## Quick Commands

### Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Check Deployment Status
```bash
# List deployments
vercel ls

# View logs
vercel logs
```

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Supabase Docs:** https://supabase.com/docs
- **Deployment Guide:** See `md/VERCEL_DEPLOYMENT.md`

---

**Ready?** Start with Step 1 above! 🚀

