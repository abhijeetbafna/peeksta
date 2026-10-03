# Peeksta — Instagram Audience & DM Analytics Studio

> Next-generation client-side Instagram audience analytics, reciprocity tracking, DM insights, and network intelligence.

Peeksta is a privacy-first, client-side web application designed for analyzing Instagram audience reciprocity, unfollower dynamics, DMs, conversation analytics, and account health directly from official Instagram data exports.

---

## 🌟 Key Features

### 💬 DM Studio & Conversation Viewer
- 📝 **Edited Message History**: View full unredacted edit logs for edited messages (compare draft vs final edited text).
- 🎬 **Shared Reels Gallery & Media Vault**: Dedicated tab to explore all shared Instagram Reels, videos, and photos across chat history.
- 🖼️ **Real-Time Profile Picture Fetcher**: Dynamically fetches participant avatars with instant fallbacks.
- 🎵 **Voice Notes & Media Player**: Play audio notes, view photo galleries, and search keywords within any DM thread.
- 🚀 **Interactive Message Jumping**: Instantly scroll to the 1st conversation date, record peak day, or latest message with glowing message highlights.
- 🔍 **Cross-Thread Search**: Search for matching message snippets across all your conversations.
- 📱 **Mobile-Optimized Single-Pane UI**: Native app-like navigation between chat list and thread views on mobile devices.
- 💾 **Standalone Chat Archiver**: Download your chats in HTML, TXT, or JSON format.

### 📊 Deep Conversation Insights & Analytics
- 🗓️ **Timeline Milestones & On This Day**: 1st conversation start date, peak activity record day, and flashback cards highlighting milestone messages sent on this calendar day in past years.
- 📈 **Relationship Timeline**: Visual monthly histogram tracking messaging progression over time.
- 📝 **Average Text Length Dynamics**: Measures average word and character count per message per participant (showing who writes longer texts).
- 😆 **Laughing-Emoji & Slang Detection**: Built-in detection for 😂, 🤣, 💀, lol, lmao, and more, paired with conversation starter phrase breakdowns.
- ⚖️ **Compare Two Chats Modal**: Side-by-side comparative analysis of message volume, double texting, curiosity score, humor meter, and streaks across any two conversations.
- 🌙 **Late Night Chatter Index**: Tracks midnight to 6 AM message volume and conversation starter frequencies.
- ⚡ **Reply Speed Latency & Double Texting**: Measures response latency and instances of double-texting.
- 📱 **9:16 Story Recap Card Generator**: Create customizable, shareable 9:16 Instagram Story cards and download high-res PNG summaries.

### 👥 Audience & Reciprocity Tracking
- 🔄 **Audience Reciprocity & Allocation**: Instantly discover non-followers (accounts you follow who do not follow back), mutual friends, and admirer accounts with visual bento distribution charts.
- ⚡ **Fast Review Queue**: Keyboard-driven workflow (`J` / `K` / `Space` / `S` / `U`) to quickly review non-followers and streamline account management.
- ⏳ **Time-Machine & Historical Diff**: Save audience snapshots securely to local storage and compare snapshots across dates to track unfollowers over time.
- ⭐ **VIP Protection Whitelist**: Whitelist key creators, celebrities, and close friends so they are protected from cleanup queues and exports.
- 🛡️ **Security & Privacy Audit**: Evaluates profile security, 2FA status, and phonebook exposure with an interactive health scorecard.
- 📥 **100% Client-Side Privacy**: Zero credentials, tokens, or network uploads required. All parsing and analysis happens entirely inside your browser.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or higher)
- npm or pnpm

### Local Setup

```bash
# Clone repository
git clone https://github.com/abhijeetbafna/peeksta.git

# Navigate into project directory
cd peeksta

# Install dependencies
npm install

# Launch dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📦 How to Export Your Instagram Data

1. Open Instagram on your mobile app or web browser.
2. Go to **Settings & Privacy** ➔ **Accounts Center**.
3. Select **Your Information and Permissions** ➔ **Download your information**.
4. Request a download for **Followers and following** and **Messages** (and optionally **Likes**).
5. Ensure the format is set to **JSON** and Date Range is set to **All time**.
6. Download the generated ZIP file and drop it directly into Peeksta.

---

## 🔒 Privacy Guarantee

Peeksta operates with a strict zero-telemetry architecture:
- **Client-Side Only**: 100% of data processing occurs inside your local JavaScript engine.
- **No Remote Servers**: Your followers, following list, DM metadata, and contact logs are never sent to any server.
- **Clear All My Data**: A one-click purge button wipes all IndexedDB databases and localStorage, leaving zero footprint.
- **PWA Offline Support**: Installable as a Progressive Web App (PWA) with full offline functionality.

---

## 📜 License

MIT License © [Abhijeet Bafna](https://github.com/abhijeetbafna)
