# Fix Google OAuth Redirect to Localhost Issue

## Problem
When you sign in with Google on mobile:
- ✅ Browser opens correctly
- ✅ You select a Google account
- ❌ Redirects to `localhost` (which doesn't load)
- ❌ Should redirect to `inword://auth/callback`

## Root Cause
The Supabase Google OAuth provider is configured with `localhost` as the redirect URL instead of your app's deep link.

---

## Solution: Update Supabase Settings

### Step 1: Go to Supabase Auth Providers

Open: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/auth/providers

### Step 2: Find Google Provider

Scroll down to find **"Google"** in the providers list.

### Step 3: Click "Edit" or Configure

You should see Google OAuth settings with:
- Client ID
- Client Secret
- **Authorized redirect URIs** or **Site URL**

### Step 4: Add/Update Redirect URLs

Make sure these URLs are listed in the Google Provider settings:

**For Development (Expo Go):**
```
inword://auth/callback
```

**For Web (if you're also using web):**
```
http://localhost:19006/auth/callback
https://your-domain.com/auth/callback (if you have a domain)
```

### Step 5: Save Changes

Click **"Save"** or **"Update"**

---

## Alternative: Check Site URL in Supabase

### Go to URL Configuration

Open: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/auth/url-configuration

### Check "Site URL"

The **Site URL** might be set to `http://localhost:3000` or similar.

**For mobile, you can try:**
1. Leave it as localhost for web development
2. OR set it to your app scheme: `inword://`

### Add Redirect URLs

In the **"Redirect URLs"** section, make sure you have:
```
inword://auth/callback
http://localhost:19006/auth/callback
```

Both should be in the list!

---

## If Using Google Cloud Console

If you set up Google OAuth yourself, you also need to update Google Cloud Console:

### Step 1: Go to Google Cloud Console

https://console.cloud.google.com/apis/credentials

### Step 2: Find Your OAuth Client

Click on your OAuth 2.0 Client ID

### Step 3: Add Authorized Redirect URIs

Add these to the **"Authorized redirect URIs"** list:

```
https://dkhocivmblgkklofgmrp.supabase.co/auth/v1/callback
inword://auth/callback
```

The first one is Supabase's OAuth callback (required!).
The second one is your app's deep link.

### Step 4: Save

Click **"Save"** at the bottom.

**Note:** It may take a few minutes for Google to update.

---

## Testing After Fix

1. **Restart your Expo app** completely (close and reopen)
2. **Try Google Sign-In** again
3. This time, after you select your account:
   - ✅ Should redirect to your app
   - ✅ Browser should close
   - ✅ You should be signed in!

---

## Check Console Logs

After clicking your Google account, you should see:

```
🔗 Deep link received: inword://auth/callback?access_token=...
✅ OAuth callback detected
🔐 Setting session from OAuth callback
🔐 Auth state changed - Event: SIGNED_IN
```

If you still see localhost redirect:
- ❌ The redirect URL wasn't saved properly in Supabase
- ❌ You might need to wait a few minutes for changes to propagate

---

## Quick Checklist

- [ ] Added `inword://auth/callback` to Supabase Auth URL Configuration → Redirect URLs
- [ ] Checked Google provider settings in Supabase (if they exist)
- [ ] Restarted Expo app
- [ ] Tested Google Sign-In

---

## Still Not Working?

### Option 1: Check What Redirect URL is Being Sent

Look at the console when you click "Continue with Google":

```
🔗 Redirect URL: inword://auth/callback
```

If this shows `localhost` instead, the code is wrong. But it should show the deep link.

### Option 2: Verify in Supabase Logs

1. Go to: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/logs/explorer
2. Look for recent auth logs
3. Check what redirect URL was used

### Option 3: Screenshot and Share

If still stuck:
1. Take a screenshot of your Supabase Auth URL Configuration page
2. Take a screenshot of your Google Provider settings
3. Share the console logs when you try to sign in

The issue is 100% in the Supabase redirect URL configuration!
