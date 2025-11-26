# Fixing Firebase Cloud Functions Deployment Permissions

## The Issue

You're getting this error when trying to deploy Cloud Functions:

```
Error: Missing permissions required for functions deploy. You must have permission 
iam.serviceAccounts.ActAs on service account anonimotransportes-b8019@appspot.gserviceaccount.com.
```

## Solution: Grant Service Account User Role

### Step 1: Open IAM Console

Go to your project's IAM page:
**https://console.cloud.google.com/iam-admin/iam?project=anonimotransportes-b8019**

### Step 2: Find Your Account

Look for your email: **miguelc.23.24.25@gmail.com** in the list of principals.

### Step 3: Add the Required Role

1. Click the **Edit** (pencil) icon next to your account
2. Click **+ ADD ANOTHER ROLE**
3. Search for and select: **Service Account User**
4. Click **SAVE**

### Step 4: Try Deploying Again

After adding the role, wait a minute for the permissions to propagate, then try:

```bash
npm run firebase:deploy
```

---

## Alternative: Deploy Only Hosting First

If you want to deploy just the frontend without Cloud Functions for now:

```bash
npm run build:client
firebase deploy --only hosting
```

Then later, once you have the permissions, deploy the functions:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

---

## If You're Not the Project Owner

If someone else owns the Firebase project, ask them to:

1. Go to the IAM page (link above)
2. Grant you the **Service Account User** role
3. Alternatively, they can grant you the **Editor** or **Owner** role which includes all necessary permissions

---

## Understanding the Error

Firebase Cloud Functions run under a service account. To deploy functions, your account needs permission to "act as" that service account. This is a security feature to ensure only authorized users can deploy code that runs with elevated privileges.

The **Service Account User** role (`roles/iam.serviceAccountUser`) grants the `iam.serviceAccounts.actAs` permission, which is exactly what you need.
