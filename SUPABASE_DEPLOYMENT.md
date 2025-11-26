# Supabase Backend Deployment Guide

## Overview

Your application now uses:
- **Frontend**: Firebase Hosting (https://anonimotransportes-b8019.web.app) ✅ Already deployed
- **Backend**: Supabase Edge Functions (to be deployed)

This avoids the Firebase Cloud Functions billing requirement!

---

## Prerequisites

### 1. Supabase Project

You need a Supabase project. If you don't have one:

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details
4. Wait for project to be created (~2 minutes)

### 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API Key** (anon/public key)
   - **Project Reference ID** (from the URL or settings)

---

## Setup Steps

### Step 1: Update Environment Variables

Edit `.env` file and replace the placeholder values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key

# For local development
VITE_API_URL=http://localhost:54321/functions/v1

# For production (after deploying), update to:
# VITE_API_URL=https://YOUR-PROJECT-REF.supabase.co/functions/v1
```

### Step 2: Update Supabase Config

Edit `supabase/config.toml` and update the project_id:

```toml
project_id = "your-project-ref"
```

### Step 3: Login to Supabase

```bash
npx supabase login
```

This will open your browser for authentication.

### Step 4: Link to Your Project

```bash
npx supabase link --project-ref your-project-ref
```

Replace `your-project-ref` with your actual Supabase project reference ID.

---

## Local Development

### Start Supabase Locally

```bash
npm run supabase:start
```

This starts local Supabase services including:
- API: http://localhost:54321
- Studio: http://localhost:54323
- Edge Functions

### Serve Edge Functions Locally

In a separate terminal:

```bash
npm run supabase:serve
```

This runs your Edge Function at:
- http://localhost:54321/functions/v1/api/ping
- http://localhost:54321/functions/v1/api/demo

### Test the API

```bash
# Test ping endpoint
curl http://localhost:54321/functions/v1/api/ping

# Test demo endpoint
curl http://localhost:54321/functions/v1/api/demo
```

### Run Frontend Dev Server

In another terminal:

```bash
npm run dev
```

Your frontend will connect to the local Supabase Edge Functions.

### Stop Supabase

When done:

```bash
npm run supabase:stop
```

---

## Production Deployment

### Step 1: Deploy Edge Function

```bash
npm run supabase:deploy
```

Or manually:

```bash
npx supabase functions deploy api
```

This deploys your Edge Function to Supabase's global edge network.

### Step 2: Set Environment Variables in Supabase

Set secrets for your Edge Function:

```bash
npx supabase secrets set PING_MESSAGE="ping pong"
```

Add any other environment variables your function needs.

### Step 3: Update Frontend Environment Variables

Update `.env` for production:

```env
VITE_API_URL=https://YOUR-PROJECT-REF.supabase.co/functions/v1
```

### Step 4: Rebuild and Deploy Frontend

```bash
npm run deploy
```

This will:
1. Build the frontend with production API URL
2. Deploy to Firebase Hosting

---

## API Endpoints

After deployment, your API will be available at:

**Production:**
- `https://YOUR-PROJECT-REF.supabase.co/functions/v1/api/ping`
- `https://YOUR-PROJECT-REF.supabase.co/functions/v1/api/demo`

**Local:**
- `http://localhost:54321/functions/v1/api/ping`
- `http://localhost:54321/functions/v1/api/demo`

---

## Updating the Edge Function

When you make changes to `supabase/functions/api/index.ts`:

### For Local Testing:
1. The function auto-reloads when using `npm run supabase:serve`
2. Just save your changes and test

### For Production:
1. Make your changes
2. Run `npm run supabase:deploy`
3. Changes are live immediately

---

## Adding New API Routes

Edit `supabase/functions/api/index.ts` and add to the `handlers` object:

```typescript
const handlers: Record<string, (req: Request) => Promise<Response>> = {
  "/api/ping": async () => { /* ... */ },
  "/api/demo": async () => { /* ... */ },
  
  // Add new route:
  "/api/new-route": async (req: Request) => {
    return new Response(
      JSON.stringify({ message: "New route!" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  },
};
```

---

## Monitoring and Logs

### View Function Logs

```bash
npx supabase functions logs api
```

Or view in the Supabase Dashboard:
1. Go to **Edge Functions** in your project
2. Click on the `api` function
3. View logs and metrics

---

## Troubleshooting

### Function not deploying

Make sure you're linked to the correct project:
```bash
npx supabase projects list
npx supabase link --project-ref your-project-ref
```

### CORS errors

Update the `corsHeaders` in `supabase/functions/api/index.ts`:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://anonimotransportes-b8019.web.app",
  // ... rest of headers
};
```

### Environment variables not working

Set them in Supabase:
```bash
npx supabase secrets set KEY=value
```

List current secrets:
```bash
npx supabase secrets list
```

### Local Supabase won't start

Reset everything:
```bash
npx supabase stop
npx supabase db reset
npx supabase start
```

---

## Cost Comparison

### Supabase Edge Functions (FREE TIER)
- ✅ 2 million invocations/month
- ✅ 10 GB bandwidth/month
- ✅ No credit card required

### Firebase Cloud Functions
- ❌ Requires Blaze plan (pay-as-you-go)
- ❌ Billing upgrade needed
- ❌ Credit card required

**Supabase is the better choice for your use case!**

---

## Next Steps

1. ✅ Create/access your Supabase project
2. ✅ Update `.env` with your Supabase credentials
3. ✅ Link to your project: `npx supabase link`
4. ✅ Deploy Edge Function: `npm run supabase:deploy`
5. ✅ Update frontend API URL in `.env`
6. ✅ Deploy frontend: `npm run deploy`

Your app will then be fully deployed with both frontend and backend! 🎉
