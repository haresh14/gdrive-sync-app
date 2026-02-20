# GDrive Sync App – Development Plan

## Overview

Cross-platform Electron app (macOS/Ubuntu) for syncing folders with Google Drive. Inspired by [FreeFileSync](https://freefilesync.org/) with a dual-pane interface, configurable sync modes, and multi-account support.

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│  App Launch                                                              │
│  ├─ Load saved configs from Documents/GDriveSyncApp/ (if any)           │
│  └─ Show main sync interface                                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Main Interface                                                          │
│  ├─ [Left Pane]  Source: Local path | Google Drive (Account A)           │
│  ├─ [Right Pane] Target: Local path | Google Drive (Account B)         │
│  ├─ Add multiple folder pairs                                            │
│  ├─ Sync Mode: Mirror | One-way (L→R or R→L) | Two-way                   │
│  ├─ Accounts: Add/Remove Google accounts                                │
│  └─ Actions: Compare | Sync | Save Config | Load Config                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Sync Execution                                                          │
│  ├─ Compare files (size, modified time)                                  │
│  ├─ Show diff preview                                                   │
│  └─ Execute sync with progress                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Renderer (UI)                                                    │
│  - React + Tailwind (or vanilla + CSS)                           │
│  - Dual-pane folder picker                                       │
│  - Sync mode selector                                            │
│  - Account manager                                               │
└────────────────────────┬─────────────────────────────────────────┘
                         │ IPC
┌────────────────────────▼─────────────────────────────────────────┐
│  Main Process (Electron)                                          │
│  - Settings service (read/write config files)                     │
│  - Sync orchestrator                                              │
│  - IPC handlers                                                   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────────┐
│  Services                                                         │
│  - GoogleAuthService (OAuth PKCE, token refresh)                  │
│  - GoogleDriveService (list/upload/download/delete)                │
│  - LocalFileService (read/write local paths)                      │
│  - SyncEngine (compare + transfer logic)                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Sync Modes

| Mode | Description | Source → Target | Target → Source |
|------|-------------|-----------------|------------------|
| **Mirror** | Target is exact copy; deletes on target if removed from source | Copy new/updated | Delete only |
| **One-way (L→R)** | Source to target only; target changes ignored | Copy new/updated | None |
| **One-way (R→L)** | Target to source only; source changes ignored | None | Copy new/updated |
| **Two-way** | Bidirectional; both sides updated; conflicts handled by timestamp | Copy both ways | Copy both ways |

---

## Config File Format

**Location**: `~/Documents/GDriveSyncApp/*.gdsync.json` (user-selectable)

```json
{
  "version": 1,
  "name": "My Backup Config",
  "folderPairs": [
    {
      "source": { "type": "local", "path": "/Users/me/Projects" },
      "target": { "type": "drive", "accountId": "abc123", "folderId": "root" }
    },
    {
      "source": { "type": "drive", "accountId": "abc123", "folderId": "xxx" },
      "target": { "type": "drive", "accountId": "def456", "folderId": "yyy" }
    }
  ],
  "syncMode": "mirror",
  "settingsPath": "~/Documents/GDriveSyncApp"
}
```

---

## Phases & Tasks

### Phase 1: Project Setup & Scaffolding
| # | Task | Testable Outcome |
|---|------|------------------|
| 1.1 | Init npm project, add Electron | `npm run dev` opens empty window |
| 1.2 | Add TypeScript, ESLint, build scripts | `npm run build` succeeds |
| 1.3 | Configure for macOS & Linux (electron-builder) | Build produces .dmg (mac) & .AppImage (linux) |
| 1.4 | Add IPC bridge boilerplate | Renderer can call main and get response |

### Phase 2: Settings & Config Storage
| # | Task | Testable Outcome |
|---|------|------------------|
| 2.1 | Define config schema (Zod/JSON) | Config types export correctly |
| 2.2 | Implement SettingsService (default path: Documents/GDriveSyncApp) | Save/load config to default path |
| 2.3 | Add “settings location” dialog | User can change config base path |
| 2.4 | Expose save/load via IPC | UI can save and load configs |

### Phase 3: Google OAuth & Auth
| # | Task | Testable Outcome |
|---|------|------------------|
| 3.1 | Create Google Cloud project, enable Drive API | OAuth consent works in browser |
| 3.2 | Implement PKCE auth flow in Electron | User logs in, tokens stored securely |
| 3.3 | Token refresh & persistence | Tokens survive app restart |
| 3.4 | Multi-account: add, list, remove accounts | Multiple accounts in UI |

### Phase 4: Google Drive Service
| # | Task | Testable Outcome |
|---|------|------------------|
| 4.1 | List files/folders for a path | Returns folder tree for Drive |
| 4.2 | Upload file to Drive | File appears in Drive |
| 4.3 | Download file from Drive | File saved locally |
| 4.4 | Create folder, delete file | CRUD operations work |
| 4.5 | Resumable upload for large files | Large uploads don’t fail |

### Phase 5: Main UI (FreeFileSync-style)
| # | Task | Testable Outcome |
|---|------|------------------|
| 5.1 | Layout: toolbar, dual pane, status bar | Matches wireframe |
| 5.2 | Source/target picker: Local path | Folder picker works on macOS & Linux |
| 5.3 | Source/target picker: Google Drive | Browse Drive folder tree |
| 5.4 | Add/remove folder pairs | Multiple pairs in list |
| 5.5 | Sync mode dropdown (Mirror, One-way L→R, One-way R→L, Two-way) | Mode persists in config |
| 5.6 | Account selector per pane | Can choose different accounts for source/target |
| 5.7 | Compare button (dry-run) | Shows file diff without syncing |
| 5.8 | Sync button | Triggers real sync |
| 5.9 | Save/Load config | Config files round-trip correctly |
| 5.10 | Sync progress & log | Progress bar and log during sync |

### Phase 6: Sync Engine
| # | Task | Testable Outcome |
|---|------|------------------|
| 6.1 | Compare local vs local | Returns diff list |
| 6.2 | Compare local vs Drive | Returns diff list |
| 6.3 | Compare Drive vs Drive | Returns diff list |
| 6.4 | Mirror sync (local ↔ Drive) | Target matches source after sync |
| 6.5 | One-way sync | Only one direction transfers |
| 6.6 | Two-way sync | Both sides updated; conflict handling by mtime |
| 6.7 | Parallel transfers (configurable) | Multiple files transfer concurrently |

### Phase 7: Polish & Cross-Platform
| # | Task | Testable Outcome |
|---|------|------------------|
| 7.1 | Ensure paths work on macOS & Linux | No hardcoded `/` or `\` |
| 7.2 | Handle Linux keyring for tokens | Tokens stored via keytar/electron-store |
| 7.3 | Error handling & user-facing messages | Clear errors for auth/sync failures |
| 7.4 | Basic E2E test | Critical path automated |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| App shell | Electron 28+ |
| UI | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand or React Context |
| Auth | googleapis + PKCE |
| Config | JSON files + `fs/promises` |
| Tokens | electron-store (encrypted) |
| Build | electron-builder |

---

## File Structure (Target)

```
gdrive-sync-app/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   └── preload.ts
│   ├── services/
│   │   ├── settings.ts
│   │   ├── google-auth.ts
│   │   ├── google-drive.ts
│   │   └── sync-engine.ts
│   ├── preload/
│   │   └── index.ts
│   └── renderer/       # React app
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       ├── hooks/
│       └── store/
├── resources/         # Icons, etc.
└── DEVELOPMENT_PLAN.md (this file)
```

---

## Dependencies

```json
{
  "electron": "^28.0.0",
  "react": "^18.2.0",
  "vite": "^5.0.0",
  "electron-builder": "^24.0.0",
  "googleapis": "^128.0.0",
  "electron-store": "^8.1.0",
  "zod": "^3.22.0"
}
```

---

## Implementation Order

1. **Phase 1** → Run empty window, build for both platforms  
2. **Phase 2** → Save/load config to disk  
3. **Phase 3** → Google login with PKCE, multi-account  
4. **Phase 4** → Drive list/upload/download  
5. **Phase 5** → Full UI (can use mock Drive at first)  
6. **Phase 6** → Real sync logic  
7. **Phase 7** → Polish and tests  

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Google API quotas | Implement backoff; document limits |
| Large file sync | Resumable uploads; chunked downloads |
| Token exposure | Use PKCE; store in electron-store |
| Path differences (mac/Linux) | Use `path` module; avoid `process.platform` hacks |
