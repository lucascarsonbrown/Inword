# InWord

A privacy-focused personal development app that combines journaling, AI-powered insights, goal tracking, and vision boarding to help you reflect, grow, and achieve your goals.

## Features

- **Journal**: Daily journaling with mood tracking and encrypted storage
- **Insights**: AI-powered reflections and analysis of your journal entries
- **Vision Board**: Visual goal setting and tracking
- **AI Chat**: Conversational AI assistant powered by Google Gemini
- **Private Knowledge Base**: Your personal insights and patterns, securely stored
- **End-to-End Encryption**: All sensitive data is encrypted on your device before being stored

## Privacy & Security

- **Client-Side Encryption**: All journal entries, insights, and chat messages are encrypted using AES-256-GCM before leaving your device
- **Secure Storage**: Encryption keys are stored in iOS Keychain / Android Keystore
- **Row-Level Security**: Database access is strictly controlled per user - you can only see your own data
- **API Keys Protected**: Gemini API key is stored securely in Edge Functions, not exposed to clients
- **Private by Default**: Your data is yours - not even the server can read your encrypted content

## Architecture

The app uses a secure serverless architecture:

- **Frontend**: React Native with Expo (client-side encryption)
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **AI Layer**: Supabase Edge Functions (Deno runtime)
  - `ai-chat`: Handles conversational AI responses
  - `generate-insights`: Creates journal reflections
  - `extract-kb`: Extracts knowledge base insights
- **AI Provider**: Google Gemini API (accessed only via Edge Functions)
- **Authentication**: Supabase Auth with Google Sign-In
- **Encryption**: AES-256-GCM with expo-crypto

## Quick Start for Users

### 1. Clone the repository

```bash
git clone https://github.com/lucascarsonbrown/Inword.git
cd Inword
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

The `.env.example` file already contains working Supabase credentials. Your data will be private thanks to Row Level Security.

### 4. Start the app

```bash
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Setup for Developers (Self-Hosting)

If you want to deploy your own instance with your own backend:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key
3. Update `.env` with your credentials

### 2. Deploy Edge Functions

The Edge Functions handle all AI operations securely:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Set the Gemini API key secret
supabase secrets set GEMINI_API_KEY=your_gemini_api_key_here

# Deploy all functions
supabase functions deploy ai-chat
supabase functions deploy generate-insights
supabase functions deploy extract-kb
```

### 3. Set up Database Schema

Run the SQL files in your Supabase SQL editor (available locally, not in repo for security).

### 4. Configure Authentication

1. Enable Google OAuth in Supabase Auth settings
2. Add redirect URLs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `inword://auth/callback` (for mobile)

## How It Works

The app uses a shared backend but your data is completely isolated:

1. **Sign in with Google** - Create your own account
2. **All your data is encrypted** - Before it leaves your device
3. **Row Level Security** - The database ensures you can only access your own data
4. **Edge Functions** - AI processing happens server-side with your API key secured
5. **Privacy First** - Even if someone else uses the same backend, they can't see your data

## Development

### Project Structure

- `app/` - Screen components and routes
- `components/` - Reusable UI components
- `contexts/` - React Context providers (Auth, App state)
- `services/` - Backend services (database, AI client, encryption)
- `lib/` - Utility libraries (Supabase client, crypto)
- `config/` - Configuration files (AI prompts)
- `types/` - TypeScript type definitions
- `supabase/functions/` - Edge Functions (Deno)

### Key Services

- **Authentication**: `contexts/AuthContext.tsx`
- **Database Operations**: `services/database.ts`
- **AI Integration**: `services/gemini.ts` (calls Edge Functions)
- **Encryption**: `lib/encryption.ts`
- **Knowledge Base**: `services/kb-manager.ts`
- **KB Extraction**: `services/kb-extractors.ts` (calls Edge Functions)

### Edge Functions

All AI operations are handled by serverless Edge Functions:

- **Location**: `supabase/functions/`
- **Runtime**: Deno
- **Deployment**: Via Supabase CLI
- **Secrets**: Managed via `supabase secrets set`

To test functions locally:

```bash
supabase functions serve ai-chat --env-file supabase/.env
```

## Building for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Important Notes

- **Your encryption keys never leave your device** - If you uninstall the app, you'll lose access to your encrypted data
- **Each user gets their own isolated data** - Enforced by database-level security policies
- **The shared Supabase credentials are safe** - They only allow authenticated access to your own data
- **Gemini API key is server-side only** - Never exposed to clients, preventing abuse

## Environment Variables

### Client (.env)
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Edge Functions (supabase/.env)
```bash
GEMINI_API_KEY=your_gemini_api_key
```

**Note**: The `supabase/.env` file is for local testing only. In production, use `supabase secrets set`.

## License

Private project - All rights reserved

## Contact

For questions or issues, open an issue on GitHub or contact the repository owner.
