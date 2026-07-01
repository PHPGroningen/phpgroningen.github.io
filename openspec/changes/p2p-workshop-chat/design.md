## Context

GroningenPHP runs monthly workshops where a facilitator presents on a beamer screen. Currently there is no interactive back-channel for participants to share messages, ask questions, or post code snippets during a session. The website is fully static (no server-side logic, no database) hosted on GitHub Pages, so any new tool must run entirely in the browser.

## Goals / Non-Goals

**Goals:**
- Provide a single self-contained HTML page that works with zero server-side dependencies beyond static file hosting
- Enable a "star topology" P2P chat: one controller (host) connected to many participants via WebRTC data channels
- Display a beamer-optimized controller view showing all messages at large, readable size
- Generate a memorable 5-digit PIN the host can display so participants can join easily
- Support sharing PHP and JavaScript code snippets with syntax highlighting, line numbers, and one-click copy
- Use GroningenPHP brand colors/fonts so the tool feels native to the site

**Non-Goals:**
- Persistent chat history (messages disappear on page refresh)
- Private/DM messages between participants
- Authentication or moderation beyond the room PIN
- Mobile-first layout (workshop scenario primarily targets laptop/desktop)
- Supporting more than ~30 simultaneous participants (WebRTC data channel limits)

## Decisions

### 1. PeerJS for WebRTC signaling

**Decision**: Use PeerJS (loaded from CDN) as the WebRTC signaling and abstraction layer.

**Rationale**: PeerJS provides a free hosted signaling server (`0.peerjs.com`) and a clean JS API for creating peer connections and data channels — no custom backend needed. Alternatives considered:
- *Raw WebRTC + hand-rolled signaling*: Requires a WebSocket server; incompatible with static hosting.
- *Firebase Realtime Database*: Would work but introduces a Google dependency, requires API keys, and is over-engineered for a local workshop tool.
- *BroadcastChannel API*: Same-origin only; useless across participant devices.

### 2. Star topology (all peers connect to host)

**Decision**: Participants connect directly to the controller's peer ID (derived from the PIN). The controller relays broadcast messages from one participant to all others.

**Rationale**: Simplifies connection management. A full mesh (every participant connected to every other) would require O(n²) connections. The controller is already the "single source of truth" displayed on the beamer. Relay latency is acceptable for a workshop chat scenario.

### 3. Session name + auto-generated PIN (not a random token)

**Decision**: The controller enters a human-readable session name (e.g., "PHP Workshop June 2026") when starting a room. The system generates a random 5-digit numeric PIN which becomes the PeerJS room ID (`phpgrn-{pin}`). The session name is broadcast to participants and displayed alongside the PIN on the beamer.

**Rationale**: A named session makes it obvious which room you're in when multiple workshops or breakout groups run simultaneously. A 5-digit PIN (100,000 combinations) is sufficient at workshop scale because PeerJS detects collision on registration and the app retries automatically. A short numeric code is easier to read from a beamer and type on a phone than an alphanumeric token.

### 4. In-memory only — session ends when controller closes

**Decision**: All message history is kept in a JavaScript array on the controller. No `localStorage`, `IndexedDB`, or other persistence is used. When the controller page closes, a `session-end` message is sent to all peers via the `pagehide` event, then all data is garbage-collected.

**Rationale**: Matches the ephemeral workshop context — sessions are not meant to be resumed. Eliminates any privacy concerns about leftover chat data. Keeps the implementation simple with no storage APIs needed.

### 5. History replay on join

**Decision**: When a new participant connects, the controller immediately sends a single `{ type: 'history', messages: [...] }` packet containing the full in-memory message array before the live feed begins.

**Rationale**: Late joiners (e.g., someone who arrives mid-workshop or reconnects) can catch up without having missed anything. The controller is the single source of truth; pushing history on connect is simpler than participants requesting it.

### 6. Single self-contained HTML file

**Decision**: All JavaScript, CSS, and markup live in one `index.html` file. External dependencies (PeerJS, Highlight.js) loaded via CDN with integrity hashes.

**Rationale**: Easiest to deploy to the static site, easy to share, no build step. Highlight.js provides battle-tested syntax highlighting with a small footprint when loading only PHP and JS language packs.

### 5. Room link uses base64-encoded session name; PIN is never in the URL

**Decision**: The shareable URL the controller generates uses `?room={base64(sessionName)}` (UTF-8 safe via `encodeURIComponent` + `btoa`). The PIN is displayed on the beamer and always typed manually. The QR code encodes this `?room=` URL. On load, the app decodes the param to pre-fill the session name field and focuses the PIN input.

**Rationale**: The session name in the URL makes the link self-describing and human-meaningful — a participant who scans the QR knows exactly which session they are joining before they type anything. Keeping the PIN off the URL is intentional: it acts as a live access code that changes each session and cannot be shared via a persistent link. It also means a saved URL from a previous session cannot accidentally connect to a new one.

### 6. Participant name ownership via session token

**Decision**: On first join, the controller generates a 24-character hex token (`crypto.getRandomValues`), registers the participant's display name (case-insensitive) in two in-memory maps — `nameRegistry` (lowercased name → token) and `tokenRegistry` (token → display name) — and returns the token to the participant in the `history` packet. The participant stores it in `localStorage["phpgrn-token-{pin}"]`. On reconnect, the stored token is sent in connection metadata; the controller validates it and restores the name. If a new participant requests a name already owned by a different token, the connection is immediately rejected. The token is cleared from `localStorage` when the session ends.

**Rationale**: Participants navigate between workshop pages or open the widget after joining. Without name ownership, every page load would require re-entering a name, and a malicious participant could impersonate someone else. The token approach is stateless from the participant's perspective (automatic), in-memory on the controller (no database), and scoped to a single session (token+name are gone when the controller closes).

### 8. Embeddable participant widget (`widget.js`)

**Decision**: Extract the participant-side logic into a separate self-initializing script (`/workshops/chat/widget.js`). Workshop pages add it with a single `<script>` tag. The widget renders as a floating button that expands into a chat panel, using the host page's existing CSS custom properties.

**Rationale**: Prevents participants from needing to navigate away from the workshop content page. The widget reads `data-session` on the `<script>` tag or decodes `?room=` from the URL to pre-fill the session name; the PIN is always entered manually. The controller view stays a full-page app (it needs the beamer layout). The widget is a thin UI layer over the same PeerJS participant logic — no code duplication needed beyond a shared module or copy-paste of the core connection class. The same `localStorage` token mechanism applies, so participants retain their name across the widget and the full-page app within a session.

## Risks / Trade-offs

- **PeerJS cloud outage** → Mitigation: Document a self-hosted PeerJS server option in comments; the PeerJS client config can be overridden.
- **WebRTC blocked by corporate firewalls/VPNs** → Mitigation: PeerJS uses STUN by default; add a public TURN server config (e.g., Open Relay) as a fallback in the peer options.
- **Relay bottleneck on controller** → Mitigation: At workshop scale (<30 participants) this is not a practical concern. No mitigation needed.
- **Name token brute-force** → The 24-char hex token (96 bits of entropy) is unpredictable; no mitigation needed at workshop scale.
- **Widget CSS conflicts** → The widget uses a scoped class prefix (`phpgrn-widget-*`) on all its elements to avoid clashing with host page styles; it inherits brand custom properties but does not rely on global tag selectors.

## Migration Plan

1. Create `public/workshops/chat/index.html`
2. Link to it from the workshops index page (`public/workshops/index.html` or similar)
3. No rollback needed — adding a new file has zero impact on existing pages

## Open Questions

_(none — scope is well-defined)_
