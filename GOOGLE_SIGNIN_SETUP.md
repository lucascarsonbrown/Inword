# Google Sign-In Setup for Mobile

## Problem
Google Sign-In works on web but not on mobile (iOS/Android).

## What I Fixed
1. Added deep link redirect URL handling
2. Configured `expo-web-browser` to open OAuth in-app
3. Added URL callback listeners for OAuth tokens

## ⚠️ IMPORTANT: Supabase Configuration Required

For Google Sign-In to work on mobile, you **MUST** add the redirect URL to your Supabase project.

### Step 1: Go to Supabase Auth Settings

1. Open: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/auth/url-configuration
2. Scroll to **"Redirect URLs"** section

### Step 2: Add Mobile Redirect URL

Add this URL to the list:
```
inword://auth/callback
```

Click **"Add URL"** or **"Save"**

### Step 3: (Optional) Configure Google OAuth

If you haven't set up Google OAuth yet:

1. Go to: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/auth/providers
2. Find **"Google"** in the provider list
3. Enable it and add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)

---

## How It Works Now

### On Mobile (iOS/Android):
```
1. User taps "Continue with Google"
2. App opens in-app browser (Safari/Chrome view)
3. User signs in with Google
4. Google redirects to: inword://auth/callback?access_token=...
5. App intercepts the deep link
6. Tokens extracted and session created
7. User is signed in!
```

### On Web:
```
1. User clicks "Continue with Google"
2. Browser redirects to Google
3. User signs in
4. Google redirects back to your web app
5. Session created automatically
```

---

## Testing

### Before You Test:
1. **Add the redirect URL** in Supabase (see Step 2 above)
2. **Restart your Expo app** (close and reopen)

### Test Steps:
1. Open app on your phone
2. Go to sign-in screen
3. Tap "Continue with Google"
4. You should see a browser open
5. Sign in with Google
6. Browser should close automatically
7. You should be signed in!

### Watch the Console:
You should see these logs:
```
🔐 Starting Google Sign-In...
🔗 Redirect URL: inword://auth/callback
✅ Google Sign-In initiated
📱 Opening OAuth URL in browser: https://...
🌐 Browser result: { type: "success", url: "inword://..." }
🔐 Setting session from OAuth callback
🔐 Auth state changed - Event: SIGNED_IN
✅ User signed in
```

---

## Troubleshooting

### "Nothing happens when I tap the button"
- ✅ Check that you added `inword://auth/callback` to Supabase redirect URLs
- ✅ Restart the Expo app completely
- ✅ Check console logs for errors

### "Browser opens but doesn't redirect back"
- ✅ Make sure the redirect URL is **exactly**: `inword://auth/callback`
- ✅ Check that `"scheme": "inword"` is in app.json (it is)
- ✅ Try rebuilding the app: `expo start --clear`

### "Error: Invalid redirect URL"
- ✅ You forgot to add the URL in Supabase settings (see Step 2)

### "Works on web but not mobile"
- ✅ This is expected - you need to add the mobile redirect URL in Supabase

---

## Code Changes Made

### Updated Files:
1. **contexts/AuthContext.tsx**
   - Added `expo-web-browser` integration
   - Added deep link URL handling
   - Added Platform-specific redirect URLs
   - Browser opens automatically on mobile

### What Happens:
- **Web**: Uses standard OAuth redirect (works as before)
- **Mobile**: Opens in-app browser, captures deep link callback
- **All platforms**: Handles session creation from OAuth tokens

---

## Next Steps

1. **Add the redirect URL** in Supabase (required!)
2. Restart your app
3. Test Google Sign-In on your phone
4. Check console logs if it doesn't work

Once the redirect URL is added, it should work immediately!
