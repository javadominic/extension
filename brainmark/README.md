# 🧠 Contextos — Smart Bookmark Memory Assistant

> A Chrome/Opera extension that uses Gemini AI to help you remember **why** you saved every bookmark.

![Contextos](public/icons/icon128.png)

---

## ✨ Features

- **AI Auto-Note** — When you bookmark a page, Gemini instantly suggests *why* you saved it
- **Smart Tags** — Auto-generated lowercase tags for every bookmark
- **Semantic Search** — Natural language search powered by Gemini 1.5 Flash
- **Link Health** — Weekly dead-link checker with live/dead/unchecked badges
- **Teams** — Share bookmark collections with teammates via Firestore
- **Import** — Pull from Pocket, Notion, or Readwise
- **Meet/Zoom Overlay** — Floating draggable panel with relevant bookmarks during meetings
- **Toast Overlay** — Shadow DOM toast on every saved page: *"You saved this because…"*
- **Firebase Sync** — Cloud backup of all bookmarks and notes

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18 + TypeScript |
| Bundler | Vite + CRXJS plugin |
| Styling | Tailwind CSS |
| AI | Gemini 1.5 Flash (free tier) |
| Cloud | Firebase v10 (Firestore + Auth) |
| Storage | `chrome.storage.sync` + `chrome.storage.local` |
| Manifest | V3 |

---

## 🚀 Setup Instructions

### 1. Install dependencies

```bash
cd contextos
npm install
```

### 2. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication → Google provider**
4. Enable **Firestore Database** (start in test mode)
5. Go to **Project Settings → General → Your apps → Web app**
6. Copy the config values

### 3. Gemini API Key

1. Visit [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create a free API key

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_key
```

### 5. Configure OAuth2 (for Google Sign-In)

In `manifest.json`, replace `YOUR_GOOGLE_CLIENT_ID` with your OAuth2 client ID from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

> **Note:** The extension uses `chrome.identity.getAuthToken()` — NOT `signInWithPopup` (which doesn't work in extensions).

### 6. Build

```bash
npm run build
```

### 7. Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

---

## 📁 Project Structure

```
contextos/
├── public/icons/          # Extension icons (16, 48, 128px)
├── src/
│   ├── popup/             # React popup UI (380×560px)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx        # Tab router
│   │   ├── index.css      # Tailwind + design tokens
│   │   └── pages/
│   │       ├── SearchPage.tsx
│   │       ├── BookmarksPage.tsx
│   │       ├── TeamsPage.tsx
│   │       └── SettingsPage.tsx
│   ├── components/        # Shared React components
│   │   ├── BookmarkCard.tsx
│   │   ├── TagBadge.tsx
│   │   ├── HealthBadge.tsx
│   │   ├── SearchBar.tsx
│   │   ├── AddNoteModal.tsx
│   │   ├── ImportWizard.tsx
│   │   └── Toast.tsx
│   ├── background/
│   │   └── index.ts       # Service worker
│   ├── content/
│   │   ├── index.ts       # Toast injector (all URLs)
│   │   └── meetOverlay.ts # Meet/Zoom panel
│   ├── lib/
│   │   ├── firebase.ts
│   │   ├── gemini.ts
│   │   ├── storage.ts
│   │   ├── bookmarks.ts
│   │   ├── healthCheck.ts
│   │   └── imports.ts
│   └── types/
│       └── index.ts
├── manifest.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── .env.example
```

---

## 🔑 Storage Architecture

| Store | Key | Value |
|-------|-----|-------|
| `chrome.storage.sync` | `settings` | `AppSettings` |
| `chrome.storage.sync` | `health_status` | `{url → status}` |
| `chrome.storage.sync` | `last_sync` | unix timestamp |
| `chrome.storage.local` | `bookmarks_cache` | `BrainBookmark[]` |
| `chrome.storage.local` | `pending_notes` | offline queue |
| `chrome.storage.local` | `firebase_token` | ID token |
| **Firestore** | `/bookmarks/{uid}/items/{id}` | `BrainBookmark` |
| **Firestore** | `/teams/{teamId}` | `TeamData` |
| **Firestore** | `/teams/{teamId}/shared/{id}` | `BrainBookmark` |

---

## ⚠️ Important Notes

- **Never use `signInWithPopup`** in extensions — use `chrome.identity.getAuthToken()` instead
- `chrome.storage.sync` has an **8KB per-item limit** — only small settings go there
- **Content scripts cannot call Firebase directly** — they message the background service worker
- All injected UI (toast, Meet overlay) uses **Shadow DOM** to prevent style leaks
- All API keys come from `.env` — **never hardcode** them

---

## 📜 License

MIT — free to use, modify, and distribute.
