# Deploy Supabase Edge Function via Web Dashboard

Since the Supabase CLI installation is having issues on Windows, you can deploy your Edge Function directly through the Supabase web dashboard!

## Steps to Deploy

### 1. Go to Your Supabase Project

1. Visit: https://supabase.com/dashboard
2. Select your project (or create a new one)

### 2. Navigate to Edge Functions

1. In the left sidebar, click **Edge Functions**
2. Click **Create a new function** or **Deploy new function**

### 3. Create the Function

1. **Function name**: `api`
2. **Code**: Copy the entire contents of `supabase/functions/api/index.ts`

### 4. Deploy

1. Click **Deploy function**
2. Wait for deployment to complete (~30 seconds)

### 5. Get Your Function URL

After deployment, your function will be available at:

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/api
```

You can find your project ref in:
- Project Settings → General → Reference ID
- Or in your project URL

---

## Update Your Frontend

### 1. Update `.env`

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-from-settings
VITE_API_URL=https://YOUR-PROJECT-REF.supabase.co/functions/v1
```

### 2. Rebuild and Deploy Frontend

```powershell
npm run deploy
```

This rebuilds your frontend with the production API URL and deploys to Firebase Hosting.

---

## Testing Your Function

### Test via Browser

Visit in your browser:
```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/api/ping
https://YOUR-PROJECT-REF.supabase.co/functions/v1/api/demo
```

### Test via curl

```powershell
curl https://YOUR-PROJECT-REF.supabase.co/functions/v1/api/ping
curl https://YOUR-PROJECT-REF.supabase.co/functions/v1/api/demo
```

---

## Adding Environment Variables

If your function needs environment variables (like `PING_MESSAGE`):

1. Go to **Edge Functions** in Supabase Dashboard
2. Click on your `api` function
3. Go to **Settings** tab
4. Add environment variables:
   - Key: `PING_MESSAGE`
   - Value: `ping pong`
5. Click **Save**

---

## Updating the Function

When you make changes to `supabase/functions/api/index.ts`:

1. Copy the updated code
2. Go to Supabase Dashboard → Edge Functions → `api`
3. Click **Edit**
4. Paste the new code
5. Click **Deploy**

---

## Alternative: Manual CLI Installation

If you still want to use the CLI, download it manually:

1. **Download**: https://github.com/supabase/cli/releases/latest
   - Get `supabase_windows_amd64.zip`

2. **Extract** to a folder (e.g., `C:\supabase\`)

3. **Add to PATH**:
   ```powershell
   # Run as Administrator
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\supabase", "Machine")
   ```

4. **Restart terminal** and verify:
   ```powershell
   supabase --version
   ```

5. **Login and deploy**:
   ```powershell
   supabase login
   supabase link --project-ref your-project-ref
   supabase functions deploy api
   ```

---

## Summary

**Easiest Method**: Use the Supabase web dashboard to deploy your function!

1. ✅ Copy code from `supabase/functions/api/index.ts`
2. ✅ Paste into Supabase Dashboard → Edge Functions
3. ✅ Deploy
4. ✅ Update `.env` with your function URL
5. ✅ Run `npm run deploy` to redeploy frontend

No CLI installation needed! 🎉
