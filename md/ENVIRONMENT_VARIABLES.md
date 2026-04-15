# Environment Variables for Vercel

Copy these environment variables to Vercel Dashboard → Settings → Environment Variables

## Required Variables

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
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

## Optional Variables

### OpenAI (for AI features)
```
OPENAI_API_KEY=your_openai_key
```

### Twilio (for SMS/WhatsApp)
```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### Firebase (for Push notifications)
```
FIREBASE_SERVER_KEY=your_firebase_key
```

## How to Add in Vercel

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Paste each variable name and value
5. Select environments: **Production**, **Preview**, **Development**
6. Click **Save**
7. Redeploy your project

## Important Notes

- **NEXT_PUBLIC_APP_URL**: Update this to your actual Vercel URL after first deployment
- All variables should be set for all environments (Production, Preview, Development)
- Never commit these values to Git
- Rotate keys regularly for security

