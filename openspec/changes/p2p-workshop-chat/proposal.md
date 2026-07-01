## Why

Workshop facilitators at GroningenPHP need an interactive, real-time chat tool they can display on a beamer during sessions, allowing participants to share messages and code snippets without requiring any server infrastructure or accounts. A fully static, peer-to-peer solution eliminates setup friction and keeps everything self-contained within the existing static site.

## What Changes

- Add a new static HTML application (`/workshops/chat/`) that provides a peer-to-peer workshop chat
- The **controller view** (initiator) shows an enlarged, beamer-friendly display of all chat messages with a generated 5-digit room PIN
- The **participant view** (client) allows attendees to join by entering the 5-digit PIN, send messages, and share formatted code snippets
- Code snippets support PHP and JavaScript with syntax highlighting, line numbers, and a one-click copy button
- App uses GroningenPHP brand colors and fonts; no external backend, database, or storage required
- Peer-to-peer signaling via PeerJS (hosted cloud service), WebRTC data channels for actual messaging — entirely browser-side

## Capabilities

### New Capabilities

- `workshop-chat`: Self-contained P2P chat page with controller and participant roles, code snippet sharing, and beamer-optimized display

### Modified Capabilities

_(none)_

## Impact

- New file: `public/workshops/chat/index.html` (self-contained single-file app)
- No changes to existing pages, CSS, or backend
- Runtime dependency: PeerJS CDN (`peerjs.com`) and Highlight.js CDN for syntax highlighting
- Requires participants to have a modern browser with WebRTC support
