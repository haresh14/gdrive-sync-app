# GDrive Sync App

Cross-platform Electron app (macOS & Linux) for syncing folders with Google Drive. Inspired by [FreeFileSync](https://freefilesync.org/).

## Features

- **Folder pairs**: Sync single or multiple folder pairs (local ↔ Google Drive)
- **Bidirectional**: Local → Drive, Drive → Local, or both accounts
- **Sync modes**: Mirror, One-way (L→R or R→L), Two-way
- **Multi-account**: Add multiple Google accounts, use different accounts for source and target
- **Config persistence**: Save/load sync configs (default: `~/Documents/GDriveSyncApp/`)

## Prerequisites

- Node.js 20+ (or 18 for older Vite)
- Google Cloud project with Drive API enabled (for production use)

## Setup

```bash
npm install
```

### Google OAuth

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Drive API**
3. Create OAuth 2.0 credentials → **Desktop app** (no redirect URI config needed)
4. Add to `.env`:
   ```
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
   Get both from your OAuth client credentials.

## Development

```bash
npm run dev
```

Starts Vite dev server + Electron. Hot reload for renderer.

## Build

```bash
npm run build        # Build for current platform
npm run dist:mac     # Package for macOS (dmg)
npm run dist:linux   # Package for Linux (AppImage, deb)
```

## Project Structure

```
gdrive-sync-app/
├── src/
│   ├── main/         # Electron main process
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   └── services/
│   ├── preload/      # Preload scripts
│   ├── renderer/     # React UI
│   │   ├── components/
│   │   └── App.tsx
│   └── shared/       # Shared types & schema
├── dist/             # Built renderer
├── dist-main/        # Built main process
└── DEVELOPMENT_PLAN.md
```

## Config Format

Configs are stored as `.gdsync.json`:

```json
{
  "version": 1,
  "name": "My Sync",
  "folderPairs": [
    {
      "source": { "type": "local", "path": "/Users/me/Projects" },
      "target": { "type": "drive", "accountId": "abc", "folderId": "root" }
    }
  ],
  "syncMode": "mirror"
}
```

## License

MIT
