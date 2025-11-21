# Testing Google Vision API Locally

## Problem
The error "404 Not Found" means the Netlify function endpoint isn't available. Netlify Functions need the Netlify CLI to run locally.

## Solution: Use Netlify CLI for Local Testing

### 1. Install Netlify CLI (if not already installed)
```bash
npm install -g netlify-cli
```

### 2. **IMPORTANT: Stop ALL current dev servers**
- Press `Ctrl+C` in **all terminals** running `pnpm dev`
- Make sure no dev server is running on port 5173 or 5174

### 3. Start with Netlify Dev
```bash
netlify dev
```

This will:
- Start your Vite dev server on port 5173
- Start the Netlify Functions server
- Make `/.netlify/functions/api` available at `http://localhost:8888`

### 4. Access your app
Open the URL shown by Netlify Dev (usually `http://localhost:8888`)

## Alternative: Test on Netlify Deployment

If you don't want to set up Netlify CLI locally:

1. **Push your code to GitHub**
2. **Deploy to Netlify**
3. **Add environment variable** in Netlify Dashboard:
   - Go to Site settings → Environment variables
   - Add `GOOGLE_APPLICATION_CREDENTIALS` with your JSON key content
4. **Test on the live site**

## Verify Setup

Once running with `netlify dev`:
1. Open rating dialog
2. Click "Detect Clothing"
3. Check browser console for any errors
4. Verify Google Vision API is being called

## Common Issues

**"Google Vision API not configured"**: 
- Make sure `GOOGLE_CLOUD_KEY_FILE` is in `.env.local`
- Restart `netlify dev` after adding environment variables

**"404 Not Found"**:
- Verify the function exists at `netlify/functions/api.ts`
- Check `netlify.toml` configuration (if it exists)
