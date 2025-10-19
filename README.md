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
- **Row-Level Security**: Database access is strictly controlled per user
- **Private by Default**: Your data is yours - not even the server can read your encrypted content

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Authentication**: Supabase Auth with Google Sign-In
- **Encryption**: AES-256-GCM with expo-crypto

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Emulator
- Supabase account
- Google Cloud Console account (for OAuth)
- Google AI Studio account (for Gemini API)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory (use `.env.example` as a template):

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 3. Database Setup

You'll need to set up the database schema in your Supabase project. The SQL files are available locally (not in git for security):
- Base schema for tables and RLS policies
- Encryption migration for encrypted columns
- Private knowledge base schema

Contact the project owner for access to these files.

### 4. Configure Authentication

Set up Google OAuth in Supabase:
1. Enable Google provider in Supabase Auth settings
2. Add redirect URLs (including `inword://auth/callback` for mobile)
3. Configure Google OAuth credentials from Google Cloud Console

### 5. Start the App

```bash
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Development

The app uses Expo Router for file-based routing. Key directories:

- `app/` - Screen components and routes
- `components/` - Reusable UI components
- `contexts/` - React Context providers (Auth, App state)
- `services/` - Backend services (database, AI, encryption)
- `lib/` - Utility libraries (Supabase client, crypto)
- `config/` - Configuration files (AI prompts)
- `types/` - TypeScript type definitions

## Key Services

- **Authentication**: `contexts/AuthContext.tsx`
- **Database Operations**: `services/database.ts`
- **AI Integration**: `services/gemini.ts`
- **Encryption**: `lib/encryption.ts`
- **Knowledge Base**: `services/kb-manager.ts`

## Building for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Security Notes

- Never commit `.env` files
- Rotate API keys if they are exposed
- The app uses client-side encryption - if users lose their device encryption key, their data cannot be recovered
- Supabase anon key is safe to use in the client (protected by RLS policies)

## License

Private project - All rights reserved

## Contact

For questions or access to setup files, contact the repository owner.
