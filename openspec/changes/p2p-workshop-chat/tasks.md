## 1. Project Scaffold

- [x] 1.1 Create directory `public/workshops/chat/` with `index.html` (full-page app) and `widget.js` (embeddable participant widget)
- [x] 1.2 Add `<style>` block with GroningenPHP brand CSS variables (`--groningen-red`, `--groningen-blue`, `--groningen-green`, fonts) and base layout styles
- [x] 1.3 Add CDN `<script>` tags for PeerJS and Highlight.js (PHP + JavaScript language packs only), with integrity hashes
- [x] 1.4 Add a link to `public/workshops/chat/` from the workshops index page

## 2. Role Selection Screen

- [x] 2.1 Build role selection HTML: two large buttons — "Start a Room (Controller)" and "Join a Room (Participant)"
- [x] 2.2 Build session setup form for controller: session name text input and a "Start Session" button
- [x] 2.3 Implement `?join={pin}` query-parameter deep-link detection; if present, skip to participant PIN entry with PIN pre-filled
- [x] 2.4 Style role selection and session setup screens using brand colors; center on the page

## 3. Controller View

- [x] 3.1 On session setup submit, generate a random 5-digit numeric PIN and register on PeerJS with ID `phpgrn-{pin}`
- [x] 3.2 Handle PIN collision: if PeerJS returns an error on registration, generate a new PIN and retry automatically
- [x] 3.3 Render the controller layout: session name as title, large PIN display, QR code of the `?join={pin}` URL, participant count badge, chat message feed, message input bar
- [x] 3.4 Implement in-memory message history: maintain a `messages[]` array; append every sent or received message to it
- [x] 3.5 Implement `DataConnection` listener: accept incoming participant connections, store them in a `peers` map, update participant count, and immediately send `{ type: 'history', messages }` to the newly connected peer
- [x] 3.6 Implement relay logic: when a message arrives from a participant, broadcast it to all other connected participants and append it to the controller's own message feed
- [x] 3.7 Implement controller "send message" action: deliver message directly to all connected participants and display in feed
- [x] 3.8 Apply beamer-optimized styles to the message feed: minimum font-size 1.4rem, high-contrast background, auto-scroll to latest message
- [x] 3.9 Implement session-end broadcast: on `pagehide` event, send `{ type: 'session-end', reason: 'host-closed' }` to all connected peers

## 4. Participant View (full-page)

- [x] 4.1 Build PIN entry screen: numeric input field (5 digits), display name field (optional, defaults to "Guest-XXXX"), and "Join" button
- [x] 4.2 On "Join" click, connect to PeerJS peer ID `phpgrn-{pin}` using the entered PIN
- [x] 4.3 Handle connection failure/timeout: show a user-friendly error message with a "Try Again" option
- [x] 4.4 On successful connection, receive the `history` packet from the controller and render all historical messages before showing the live chat input
- [x] 4.5 Display the session name (received from controller) as the chat room title
- [x] 4.6 Implement send message: send structured message object `{ type: 'chat', sender, text, timestamp }` to the controller peer
- [x] 4.7 Receive and render messages relayed by the controller (both own echoed messages and messages from others)
- [x] 4.8 Handle `session-end` message: disable input, show "Session ended by the host" notice
- [x] 4.9 Handle abrupt controller disconnect: after a short grace period, show "Host disconnected — session may have ended" and disable input

## 5. Code Snippet Sharing

- [x] 5.1 Add "Share Code" button to both controller and participant message input areas
- [x] 5.2 Build the snippet dialog/panel: language selector (PHP, JavaScript), multi-line `<textarea>`, and "Send Snippet" button
- [x] 5.3 On snippet submission, send a structured message `{ type: 'snippet', sender, language, code, timestamp }` to the controller (or broadcast if controller)
- [x] 5.4 Render received snippets in the message feed: apply `hljs.highlight(code, { language })`, wrap in a styled container with a language badge and a "Copy" button
- [x] 5.5 Implement "Copy" button: copy raw code to clipboard via `navigator.clipboard.writeText()`, briefly show "Copied!" feedback on the button

## 6. Connection Status Indicators

- [x] 6.1 Add a small status bar to both views showing: "Connecting…" (amber), "Connected" (green dot), "Disconnected" (red)
- [x] 6.2 Wire PeerJS `open`, `error`, `disconnected`, and `close` events to update the status bar
- [x] 6.3 On disconnect, attempt automatic reconnection and update status to "Reconnecting…"

## 7. Embeddable Participant Widget

- [x] 7.1 Create `public/workshops/chat/widget.js` as a self-contained IIFE that injects the chat widget into the host page
- [x] 7.2 On script load, read token from `data-pin` attribute on the `<script>` tag, falling back to `?join=` URL parameter
- [x] 7.3 Inject a floating action button (bottom-right) into the host page's `<body>`; all widget element class names use the `phpgrn-widget-` prefix to avoid CSS collisions
- [x] 7.4 Implement expand/collapse behaviour: clicking the button or pressing Escape toggles the chat panel
- [x] 7.5 Render the chat panel inside the widget: token entry (if not pre-filled) + display name + "Join" button, then message feed + input bar + "Share Code" button after joining
- [x] 7.6 Reuse the same PeerJS participant connection logic from the full-page app (extract into a shared `ChatClient` class or duplicate minimal code)
- [x] 7.7 Ensure widget.js loads PeerJS and Highlight.js via CDN only if not already present on the host page (check `window.Peer` / `window.hljs` before injecting)
- [x] 7.8 Document the embedding snippet in a comment at the top of widget.js: `<script src="/workshops/chat/widget.js" data-pin="TOKEN"></script>`

## 8. Polish & Verification

- [ ] 8.1 Test end-to-end flow: open controller (with session name), open two participant tabs, exchange plain-text messages and code snippets
- [ ] 8.2 Verify beamer readability: enlarge browser zoom to 150% and confirm session name + PIN + messages remain legible
- [ ] 8.3 Verify copy-to-clipboard works for both PHP and JavaScript snippets
- [ ] 8.4 Verify deep-link `?join={pin}` correctly pre-fills the PIN on the participant screen
- [ ] 8.5 Test QR code scannability on a mobile device
- [ ] 8.6 Verify graceful error handling when an invalid/offline PIN is entered
- [ ] 8.7 Test widget embedded in an existing workshop page (e.g., `ai-powered/index.html`): confirm no style conflicts, expand/collapse works, messages appear correctly
- [ ] 8.8 Simulate two simultaneous rooms (two controller tabs, different session names and PINs): confirm zero cross-room message leakage
- [ ] 8.9 Test late-joiner history replay: start a session, send 5 messages, open a new participant tab — verify all 5 messages appear immediately on join
- [ ] 8.10 Test session-end: close the controller tab and confirm all participant tabs show the "Session ended" notice and input is disabled
