# InstaLens — Instagram Audience & Network Intelligence

A privacy-focused, client-side web application for analyzing Instagram audience reciprocity, non-followers, and relationship dynamics directly from official Instagram export archives.

![InstaLens Dashboard Preview](src/assets/hero.png)

## Overview

InstaLens parses official Instagram JSON/ZIP archives completely in your browser. No credentials, tokens, or network uploads are required—your personal data never leaves your device.

### Key Features

- **Reciprocity Tracking**: Instantly discover non-followers (accounts you follow who do not follow back), mutual friends, and admirer accounts.
- **Fast Review Queue**: Keyboard-driven workflow (`J`/`K`/`Space`/`S`/`U`) to quickly triage non-followers and manage follow relationships.
- **Time-Machine & Historical Diff**: Save audience snapshots to your browser's IndexedDB storage and compare archives across dates to trace exact unfollowers and net growth.
- **VIP Protection Whitelist**: Star important creators, celebrities, and friends so they are excluded from cleanup lists and bulk exports.
- **Engagement Studio**: Analyze DM conversation thread counts, message activity, top liked creators, and detect silent mutual connections.
- **Security & Privacy Audit**: Health scorecard evaluating 2FA configuration, phonebook sync exposure, and profile audit logs.
- **CSV & Clipboard Export**: Export filtered account lists to CSV or copy handles directly to your clipboard.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/instalens.git

# Navigate into the project directory
cd instalens

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Visit `http://localhost:5173` to explore the dashboard.

### Production Build

```bash
# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

## How to Export Your Instagram Data

1. Open Instagram and go to **Settings & Privacy** > **Accounts Center**.
2. Select **Your Information and Permissions** > **Download your information**.
3. Choose **Download or transfer information**, select your profile, and select **Some of your information**.
4. Check **Followers and following** (and optionally **Messages** and **Likes**).
5. Set Format to **JSON** and Date Range to **All time**, then submit your request.
6. Once ready, download the ZIP archive and drop it directly into InstaLens.

## Privacy & Security

- **100% Client-Side**: All parsing, computation, and snapshot storage happens locally in your browser using IndexedDB.
- **No Remote Databases**: Your connections, messages, and contact logs are never transmitted to any external server.

## License

MIT License. See [LICENSE](LICENSE) for details.
