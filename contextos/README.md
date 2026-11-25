# Contextos — Intelligent Bookmark Memory Assistant

> A browser extension for Chrome, Brave, and Opera that helps you remember **why** you saved every page using local semantic indexing, Gemini AI, and knowledge graph mapping.

![Contextos](public/icons/icon128.png)

---

## Overview

Traditional bookmarks become digital graveyards of dead links and forgotten intentions. Contextos is designed as an active thought archive: you record your reason, tags, and memory right alongside the link.

It works quietly inside your browser to surface your past saves at the exact moment you need them — whether you are searching on Google, reviewing documentation, or attending a meeting.

---

## Features

### Hybrid Retrieval Engine (BM25 + Semantic Vectors)
- **BM25 Lexical Scoring** — Okapi BM25 (`k1=1.2, b=0.75`) with document-frequency IDF, bigram phrase detection (`1.6×` phrase multiplier), and field-weighted document tokens (Title `3×`, Tags `2×`, Note `1×`, URL `0.5×`).
- **50% Keyword Coverage Gate** — Strict gate ensuring at least half of the query's terms appear in the bookmark, eliminating false-positive matches (e.g. searching "model training" won't match train ticket booking sites).
- **Cosine Semantic Vectors** — When a Gemini API key is provided, search queries are embedded once via `text-embedding-004` and blended (`65%` semantic cosine + `35%` lexical BM25) against pre-computed bookmark vector embeddings.
- **Quota-Friendly & Offline First** — Runs locally in milliseconds without hitting API rate limits. Operates entirely offline using BM25 if no API key is present.

### Active Saving & Context Capture
- **Save with Intent** — Quick save button or shortcut (<kbd>Alt+S</kbd> / <kbd>Option+S</kbd>) captures the active tab title, URL, and prompts for your personal remark.
- **AI Auto-Notes & Tags** — Single combined Gemini call produces both a 1-sentence summary note and 2–4 relevant hashtags, conserving free-tier quota.
- **Hashtag Filtering** — Include `#tags` in your remarks or let AI extract them. Filter pills let you slice your entire library with one click.

### Site Chains & Knowledge Graph
- **Site Chains** — Saves from the same domain or research path automatically link into chronological learning chains.
- **Interactive Knowledge Graph** — Force-directed 2D graph view mapping topic clusters, domain nodes, and bookmark relationships.
- **Link Health Monitoring** — Background alarms periodically verify URLs, flagging live, dead (404/500), or redirected links with status badges.

### In-Browser Helpers
- **Search Engine Assist** — Injects relevant saved bookmarks directly alongside Google, Bing, Brave, and DuckDuckGo search result pages.
- **Corner Memory Pill** — A subtle floating pill appears on pages you have previously saved, displaying past notes and tags so you never repeat research.
- **Meeting Overlay** — Draggable quick-reference drawer for Google Meet and Zoom with saved resources relevant to your current meeting.

### Teams & Multi-Device Sync
- **Google Cloud Backup** — Multi-device synchronization via Firebase Firestore and Google Identity authentication.
- **Team Spaces** — Share collections with teammates via join codes, complete with real-time updates and unread badges.
- **Local-Only Mode** — Contextos can be used completely offline with zero accounts or cloud dependencies.

### Interactive Spotlight Onboarding
- **Live UI Spotlight Tour** — Interactive 7-step guide featuring an illuminated spotlight cutout and directional arrow pointers over real buttons, tabs, and inputs.
- **Non-Intrusive & Replayable** — Escapes cleanly via <kbd>Esc</kbd> or Skip, and can be replayed anytime from **Settings → Replay guide**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **UI Framework** | React 18, TypeScript |
| **Styling & Design System** | Tailwind CSS with warm archive design tokens |
| **Icons** | Lucide Icons + Custom Vector/Tab Assets |
| **Bundler & Extension Harness** | Vite 5 + `@crxjs/vite-plugin` (Manifest V3) |
| **AI Models** | Google Gemini (`gemini-2.5-flash` / `gemini-3.5-flash`, `text-embedding-004`) |
| **Search Engine** | Local Okapi BM25 + Bigram Phrase Extractor + Vector Cosine Blending |
| **Cloud & Authentication** | Firebase v10 (Firestore, Firebase Auth, Google OAuth2) |
| **Storage** | `chrome.storage.local` + `chrome.storage.sync` |

---

## Setup & Development

### 1. Prerequisites
- Node.js 18+ and `npm`
- Google Chrome, Brave, or any Chromium-based browser

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/contextos.git
cd contextos
npm install
```

### 3. Firebase Configuration (Optional for Cloud Sync)
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Authentication → Google provider**.
3. Enable **Firestore Database** (start in production or test mode).
4. Register a Web App in Project Settings and copy your configuration keys.

### 4. Gemini API Key (Optional for AI Auto-Notes)
Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey). You can paste this key directly into the extension's Settings page or supply it in `.env`.

### 5. Environment Variables
Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_key
```

### 6. Build the Extension
```bash
npm run build
```

### 7. Load into Browser
1. Navigate to `chrome://extensions` in your browser.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the `dist/` directory generated by `npm run build`.

---

## Project Structure

```
contextos/
├── public/
│   └── icons/              # Extension logos, tab icons, manifest assets
├── src/
│   ├── popup/              # Main extension popup interface (400×580px)
│   │   ├── index.html      # Popup entry HTML
│   │   ├── main.tsx        # React mount
│   │   ├── App.tsx         # Tab router, theme listener, spotlight tour orchestrator
│   │   ├── index.css       # Design tokens (warm archive theme), utility classes
│   │   └── pages/
│   │       ├── BookmarksPage.tsx # Bookmark library, hashtag filters, chains, bulk actions
│   │       ├── SearchPage.tsx    # Hybrid BM25 + semantic vector search
│   │       ├── GraphPage.tsx     # Topic cluster knowledge graph
│   │       ├── TeamsPage.tsx     # Collaborative bookmark spaces
│   │       └── SettingsPage.tsx  # API key, cloud account, search sensitivity, preferences
│   ├── components/         # Reusable UI components
│   │   ├── SpotlightTour.tsx # Live UI spotlight walkthrough overlay
│   │   ├── BookmarkCard.tsx  # Bookmark card with remarks, tags, and health status
│   │   ├── SiteChainCard.tsx # Domain-grouped reading chains
│   │   ├── GraphView.tsx     # Canvas/SVG knowledge graph visualization
│   │   ├── SearchBar.tsx     # Debounced search input
│   │   ├── TagBadge.tsx      # Hashtag filter chip
│   │   ├── HealthBadge.tsx   # Link health badge (alive, dead, unchecked)
│   │   ├── AddNoteModal.tsx  # Note & remark capture dialog
│   │   ├── AddToChainModal.tsx # Chain linker modal
│   │   ├── ImportWizard.tsx  # Browser/Pocket/Notion importer
│   │   ├── LucideIcons.tsx   # Curated stroke vector icon set
│   │   └── Toast.tsx         # Notification toast
│   ├── background/
│   │   └── index.ts        # Service worker: alarms, bookmark sync, message router
│   ├── content/
│   │   ├── index.ts        # In-page toast notification injector (Shadow DOM)
│   │   ├── searchSuggest.ts# In-page search assist (Google, Bing, Brave, DDG)
│   │   └── meetOverlay.ts  # Draggable resource drawer for Google Meet & Zoom
│   ├── lib/
│   │   ├── search.ts       # BM25 scoring, bigrams, cosine similarity engine
│   │   ├── gemini.ts       # Gemini API caller, note suggestion, query embeddings
│   │   ├── bookmarks.ts    # Chrome bookmark node converters & CRUD
│   │   ├── chains.ts       # Domain grouping & parent-child chain resolver
│   │   ├── graph.ts        # Cluster builder for knowledge graph
│   │   ├── storage.ts      # Chrome local/sync storage accessors & tour flags
│   │   ├── healthCheck.ts  # Background link health verification
│   │   ├── firebase.ts     # Firebase app initialization & auth
│   │   └── imports.ts      # HTML bookmark file parser
│   └── types/
│       └── index.ts        # Shared TypeScript interfaces & message contracts
├── manifest.json           # Manifest V3 configuration
├── vite.config.ts          # Vite build config with CRXJS plugin
├── tailwind.config.ts      # Tailwind configuration with warm token palette
└── tsconfig.json           # TypeScript configuration
```

---

## Storage Architecture

| Storage Provider | Key | Content | Purpose |
|---|---|---|---|
| `chrome.storage.sync` | `settings` | `AppSettings` | User preferences, theme, sensitivity threshold, API keys |
| `chrome.storage.sync` | `health_status` | `Record<string, HealthStatus>` | Cache of checked URL statuses |
| `chrome.storage.local` | `bookmarks_cache` | `BrainBookmark[]` | Fast local cache of bookmarks, notes, tags, and embeddings |
| `chrome.storage.local` | `hasCompletedTour` | `boolean` | Flag indicating onboarding spotlight tour completion |
| `chrome.storage.local` | `firebase_token` | `string` | Google OAuth2 ID token for Firebase authentication |
| **Cloud Firestore** | `/bookmarks/{uid}/items/{id}` | `BrainBookmark` | Cloud backup of saved bookmarks per authenticated user |
| **Cloud Firestore** | `/teams/{teamId}` | `TeamData` | Collaborative team space metadata and member IDs |
| **Cloud Firestore** | `/teams/{teamId}/shared/{id}` | `BrainBookmark` | Shared team bookmarks |

---

## Keyboard Shortcuts

- <kbd>Alt</kbd> + <kbd>S</kbd> (Windows/Linux) or <kbd>Option</kbd> + <kbd>S</kbd> (Mac) — Save current webpage with personal note
- <kbd>Esc</kbd> — Dismiss open dialogs, modals, or the spotlight tour
- <kbd>Enter</kbd> / <kbd>→</kbd> — Advance to next step in onboarding tour
- <kbd>←</kbd> — Return to previous step in onboarding tour

---

## License

MIT © [Contextos Contributors](LICENSE)
