# Firebase Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install globally if not already installed
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**: You need a Firebase project. Create one at [Firebase Console](https://console.firebase.google.com/)

## Initial Setup

### 1. Update Firebase Project ID

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Install Dependencies

Install root project dependencies:
```bash
pnpm install
```

Install Cloud Functions dependencies:
```bash
cd functions
npm install
cd ..
```

## Environment Variables

### Local Development

Your `.env` file in the root directory will be used for local development.

### Production (Firebase)

Set environment variables in Firebase:

```bash
firebase functions:config:set someservice.key="THE API KEY"
```

For example, if you have Google Cloud Vision API keys:
```bash
firebase functions:config:set google.vision_api_key="your-api-key"
```

Access them in your code:
```typescript
import { defineString } from 'firebase-functions/params';
const apiKey = defineString('GOOGLE_VISION_API_KEY');
```

Or use Firebase's newer approach with `.env` files in the functions directory.

## Build and Deploy

### Build the Application

Build both client and functions:
```bash
npm run firebase:build
```

This will:
1. Build the Vite client app to `dist/spa`
2. Compile TypeScript Cloud Functions to `functions/lib`

### Deploy to Firebase

Deploy everything (hosting + functions):
```bash
firebase deploy
```

Or use the npm script:
```bash
npm run firebase:deploy
```

Deploy only hosting:
```bash
firebase deploy --only hosting
```

Deploy only functions:
```bash
firebase deploy --only functions
```

## Local Testing

### Using Firebase Emulators

Start the Firebase emulators to test locally:
```bash
npm run firebase:serve
```

This will:
1. Build your application
2. Start Firebase emulators for hosting and functions
3. Provide local URLs to test your app

The emulator will typically run at:
- Hosting: http://localhost:5000
- Functions: http://localhost:5001

### Development Mode (Vite Dev Server)

For frontend-only development with hot reload:
```bash
npm run dev
```

Note: This won't include the Cloud Functions. You'll need to run the emulators separately or use the production API.

## Project Structure

```
rateMeFirebase/
├── client/              # Frontend React app
├── server/              # Original Express server (kept for reference)
├── shared/              # Shared types between client and server
├── functions/           # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts    # Main Cloud Function entry point
│   │   └── routes/     # API route handlers
│   ├── package.json
│   └── tsconfig.json
├── dist/
│   └── spa/            # Built client app (deployed to Firebase Hosting)
├── firebase.json       # Firebase configuration
├── .firebaserc         # Firebase project configuration
└── package.json
```

## API Endpoints

After deployment, your API will be available at:
- Production: `https://your-project-id.web.app/api/*`
- Local Emulator: `http://localhost:5000/api/*`

Example endpoints:
- `GET /api/ping` - Health check
- `GET /api/demo` - Demo endpoint

## Troubleshooting

### Functions not deploying

Make sure you've built the functions:
```bash
cd functions
npm run build
```

### CORS issues

The Express server is configured with CORS. If you encounter issues, check the CORS configuration in `functions/src/index.ts`.

### Environment variables not working

Ensure environment variables are set in Firebase:
```bash
firebase functions:config:get
```

### Build errors

Clear the build directories and rebuild:
```bash
rm -rf dist functions/lib
npm run firebase:build
```

## Migration from Netlify

The following changes were made:

1. **Hosting**: Moved from Netlify to Firebase Hosting
2. **Functions**: Migrated from Netlify Functions to Firebase Cloud Functions
3. **API Routes**: Changed from `/.netlify/functions/api/*` to `/api/*`
4. **Deployment**: Changed from `netlify deploy` to `firebase deploy`

The API endpoints remain the same from the client's perspective (`/api/*`), so no client code changes are needed.
