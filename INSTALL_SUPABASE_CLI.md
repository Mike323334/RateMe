# Installing Supabase CLI on Windows

## Quick Install (Recommended)

### Option 1: Direct Download

1. **Download the latest Windows binary**:
   - Go to: https://github.com/supabase/cli/releases/latest
   - Download: `supabase_windows_amd64.zip` (or `supabase_windows_arm64.zip` for ARM)

2. **Extract and Add to PATH**:
   ```powershell
   # Create a directory for Supabase
   mkdir C:\supabase
   
   # Extract the downloaded zip to C:\supabase
   # You should now have C:\supabase\supabase.exe
   
   # Add to PATH (run PowerShell as Administrator)
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\supabase", "Machine")
   ```

3. **Restart your terminal** and verify:
   ```powershell
   supabase --version
   ```

---

### Option 2: Using NPM (Alternative)

If the npm package didn't work, try this:

```powershell
# Remove the broken installation
pnpm remove supabase

# Install using npm instead
npm install -g supabase@latest
```

Then restart your terminal and try:
```powershell
supabase --version
```

---

### Option 3: Using Chocolatey

If you have Chocolatey installed:

```powershell
choco install supabase
```

---

## After Installation

Once installed, verify it works:

```powershell
supabase --version
```

Then proceed with login:

```powershell
supabase login
```

---

## Alternative: Use Without Installing Globally

If you can't install globally, you can use the project scripts which will use npx:

Update `package.json` scripts to use npx:

```json
{
  "scripts": {
    "supabase:login": "npx supabase login",
    "supabase:link": "npx supabase link",
    "supabase:start": "npx supabase start",
    "supabase:stop": "npx supabase stop",
    "supabase:serve": "npx supabase functions serve api",
    "supabase:deploy": "npx supabase functions deploy api"
  }
}
```

Then use:
```powershell
npm run supabase:login
npm run supabase:link -- --project-ref your-project-ref
npm run supabase:deploy
```

---

## Troubleshooting

### "supabase is not recognized"

- Make sure you restarted your terminal after installation
- Check if C:\supabase is in your PATH
- Try running PowerShell as Administrator

### NPM global install fails

- Try using npm instead of pnpm
- Clear npm cache: `npm cache clean --force`
- Try installing without -g flag and use npx

---

## Next Steps After Installation

1. Login: `supabase login`
2. Link project: `supabase link --project-ref your-project-ref`
3. Deploy function: `supabase functions deploy api`
