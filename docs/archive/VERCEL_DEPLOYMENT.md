# Vercel Deployment Guide

This guide walks you through deploying the OECS Learning Hub LMS to Vercel.

## 🚀 Quick Deploy

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Import to Vercel:**
   - Go to https://vercel.com/
   - Sign up/Login
   - Click **"Add New Project"**
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables:**
   - In Vercel project settings, go to **Environment Variables**
   - Add all variables from `.env.local` (see list below)

4. **Deploy:**
   - Click **"Deploy"**
   - Wait for build to complete

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

## 📋 Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

### PostgreSQL Database
```
POSTGRES_URL=your_postgres_url
POSTGRES_URL_NON_POOLING=your_postgres_url_non_pooling
POSTGRES_PRISMA_URL=your_prisma_url
POSTGRES_HOST=your_postgres_host
POSTGRES_USER=your_postgres_user
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_DATABASE=your_database_name
```

### Email Notifications (Resend)
```
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_from_email
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### Optional: Notification Channels
```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
FIREBASE_SERVER_KEY=your_firebase_key
```

### Optional: Other Services
```
OPENAI_API_KEY=your_openai_key (if using AI features)
STRIPE_SECRET_KEY=your_stripe_key (if using payments)
GOOGLE_CLIENT_ID=your_google_client_id (if using Google OAuth)
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🔧 Build Configuration

The project is configured with:
- **Node.js Version:** 18.x (specified in `package.json`)
- **Build Command:** `npm run build`
- **Output Directory:** `.next` (auto-detected by Vercel)
- **Install Command:** `npm install`

## 📝 Pre-Deployment Checklist

- [ ] All environment variables are set in Vercel
- [ ] Database migrations have been run in Supabase
- [ ] Supabase RLS policies are configured
- [ ] Email service (Resend) is configured
- [ ] Domain is configured (if using custom domain)
- [ ] SSL certificate is active (automatic with Vercel)

## 🗄️ Database Setup

Before deploying, ensure you've run all database migrations:

1. **Run in Supabase SQL Editor:**
   ```sql
   -- Run these in order:
   \i database/schema.sql
   \i database/lti-oneroster-schema.sql
   \i database/proctoring-plagiarism-questionbanks-schema.sql
   \i database/analytics-notifications-schema.sql
   ```

2. **Configure notification channels:**
   ```sql
   \i database/configure-notification-channels.sql
   ```

3. **Configure data warehouses:**
   ```sql
   \i database/configure-data-warehouses.sql
   ```

## 🌐 Custom Domain Setup

1. **In Vercel Dashboard:**
   - Go to **Settings** → **Domains**
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables:**
   - Update `NEXT_PUBLIC_APP_URL` to your custom domain
   - Update any webhook URLs that reference your domain

## 🔍 Post-Deployment

### 1. Verify Deployment

- Check that the site loads: `https://your-project.vercel.app`
- Test authentication
- Test key features

### 2. Monitor Logs

- Go to Vercel Dashboard → **Deployments** → Click on deployment → **Logs**
- Check for any errors or warnings

### 3. Set Up Monitoring

- Enable Vercel Analytics (optional)
- Set up error tracking (Sentry, etc.)
- Configure uptime monitoring

## 🐛 Troubleshooting

### Build Fails

**Error: Module not found**
- Check that all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: Environment variable missing**
- Add missing variables in Vercel Dashboard
- Redeploy after adding variables

**Error: Database connection failed**
- Verify Supabase credentials
- Check network access (Supabase allows all IPs by default)
- Verify database URL format

### Runtime Errors

**Error: RLS policy violation**
- Check Supabase RLS policies
- Verify service role key is set correctly

**Error: API route timeout**
- Increase function timeout in `vercel.json`
- Optimize slow queries

### Performance Issues

**Slow page loads**
- Enable Vercel Edge Functions where possible
- Optimize images
- Use Next.js Image component
- Enable caching headers

## 📊 Vercel Features to Enable

1. **Analytics:**
   - Go to **Analytics** tab
   - Enable Web Analytics

2. **Speed Insights:**
   - Enable in **Speed Insights** tab
   - Monitor Core Web Vitals

3. **Edge Functions:**
   - Use for API routes that need low latency
   - Configure in `vercel.json`

## 🔐 Security Best Practices

1. **Never commit `.env.local`**
   - Already in `.gitignore`
   - Use Vercel Environment Variables

2. **Use Service Role Key Carefully**
   - Only in server-side code
   - Never expose to client

3. **Enable Vercel Protection**
   - Enable DDoS protection
   - Configure rate limiting

4. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories

## 📚 Additional Resources

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Deployment:** https://nextjs.org/docs/deployment
- **Supabase Docs:** https://supabase.com/docs

## 🆘 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review error messages
4. Check environment variables
5. Verify database migrations

---

**Ready to deploy?** Follow the Quick Deploy steps above!

