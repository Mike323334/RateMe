# Google Cloud Vision API Setup Guide

## For Local Development

1. **Download your JSON key file** from Google Cloud Console
2. **Place it in your project root** (e.g., `d:\RateMe\google-cloud-key.json`)
3. **Add to `.gitignore`**:
   ```
   google-cloud-key.json
   ```
4. **Create a `.env.local` file** (or add to existing `.env`):
   ```
   GOOGLE_CLOUD_KEY_FILE=./google-cloud-key.json
   ```

## For Netlify Deployment

1. **Go to Netlify Dashboard** → Your site → **Site settings** → **Environment variables**
2. **Click "Add a variable"**
3. **Variable name**: `GOOGLE_APPLICATION_CREDENTIALS`
4. **Value**: Paste the **entire contents** of your JSON key file
   - Open the `.json` file in a text editor
   - Copy everything (it should start with `{` and end with `}`)
   - Paste it as the value
5. **Click "Save"**
6. **Redeploy your site** for the changes to take effect

## Testing

After setup, the `/analyze-outfit` endpoint should work. You can test it by:
1. Uploading an outfit image
2. Checking the browser console for any errors
3. Verifying that specific clothing names appear (e.g., "T-shirt", "Jeans")
