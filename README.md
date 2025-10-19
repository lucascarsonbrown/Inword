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
- **Private by Default**: Your data is yours - not even the server can read your encrypted content

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **AI**: Google Gemini API
- **Authentication**: Supabase Auth with Google Sign-In
- **Encryption**: AES-256-GCM with expo-crypto

## Quick Start

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

That's it! The `.env.example` file already contains working credentials. Your data will be private thanks to Row Level Security.

### 4. Start the app

```bash
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## How It Works

The app uses a shared backend (Supabase) but your data is completely isolated:

1. **Sign in with Google** - Create your own account
2. **All your data is encrypted** - Before it leaves your device
3. **Row Level Security** - The database ensures you can only access your own data
4. **Privacy First** - Even if someone else uses the same backend, they can't see your journal entries

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

## Important Notes

- **Your encryption keys never leave your device** - If you uninstall the app, you'll lose access to your encrypted data
- **Each user gets their own isolated data** - Enforced by database-level security policies
- **The shared credentials are safe** - They only allow authenticated access to your own data

## License

Private project - All rights reserved

## Contact

For questions or issues, open an issue on GitHub or contact the repository owner.
