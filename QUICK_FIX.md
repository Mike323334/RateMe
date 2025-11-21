# Quick Fix for 404 Error

## The Problem
You're getting 404 because `netlify dev` failed to start. You have `pnpm dev --port 5174` running, which conflicts with `netlify dev` trying to use port 5173.

## The Solution

### Step 1: Stop the current dev server
In the terminal running `pnpm dev --port 5174`, press **Ctrl+C** to stop it.

### Step 2: Start with netlify dev
```bash
netlify dev
```

### Step 3: Access the app
Open **`http://localhost:8888`** (NOT 5173 or 5174)

## Why This Matters
- `pnpm dev` = Only runs the frontend (no Google Vision API)
- `netlify dev` = Runs frontend + Netlify Functions (includes Google Vision API)

## If netlify dev still fails
The error says it's waiting for port 5173. If it still fails:

1. Make sure NO dev server is running (check all terminals)
2. Try: `netlify dev --port 8888`
3. Or update `netlify.toml` to use a different port

## Environment Variable Note
I see you set `GOOGLE_VISION_KEY_JSON` in Netlify, but for local development you need it in `.env.local`:

```
GOOGLE_APPLICATION_CREDENTIALS={"type":"service_account",...}
```

Or just use the file path approach:
```
GOOGLE_CLOUD_KEY_FILE=./rateme-61155-8a8f8209c119_json.json
```
