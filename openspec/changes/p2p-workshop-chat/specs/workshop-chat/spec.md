## ADDED Requirements

### Requirement: Role selection on load
The application SHALL present a role selection screen when first loaded, offering "Start a Room (Controller)" and "Join a Room (Participant)" options.

#### Scenario: Controller role selected
- **WHEN** a user clicks "Start a Room"
- **THEN** the app shows a session setup form where the controller enters a session name (e.g., "PHP Workshop June 2026")

#### Scenario: Session started
- **WHEN** the controller submits the session name
- **THEN** the app generates a random 5-digit numeric PIN, registers on PeerJS with ID `phpgrn-{pin}`, and displays the controller view with the session name and PIN prominently shown

#### Scenario: Participant role selected
- **WHEN** a user clicks "Join a Room"
- **THEN** the app shows a join form with a session name field and a PIN field

#### Scenario: Deep-link join
- **WHEN** the page is loaded with a `?room={name}` query parameter (e.g., `/chat/?room=phpworkshop`)
- **THEN** the app skips role selection, decodes the URL-encoded value to pre-fill the session name field, and focuses the PIN field so the participant only needs to type the PIN manually; matching is case-insensitive

---

### Requirement: Controller room management
The controller SHALL manage the room lifecycle, including displaying the session name and PIN, accepting participant connections, and relaying messages.

#### Scenario: Session name and PIN display
- **WHEN** the controller view is active
- **THEN** the session name is shown as the room title and the 5-digit PIN is displayed in a large, clearly readable font suitable for projection on a beamer

#### Scenario: PIN regeneration
- **WHEN** the controller clicks "New PIN"
- **THEN** the app generates a fresh PIN and re-registers on PeerJS (existing participants are notified the session reset)

#### Scenario: Participant joins
- **WHEN** a participant connects using the correct PIN
- **THEN** the controller receives the connection, sends the full message history to the new participant, adds them to the active participant list, and shows an updated participant count

#### Scenario: PIN collision on start
- **WHEN** the generated PIN is already taken on the PeerJS signaling server
- **THEN** the app automatically generates a new PIN and retries registration without requiring controller action

#### Scenario: QR code display
- **WHEN** the controller view is active
- **THEN** a QR code encoding the full join URL (e.g., `https://groningenphp.nl/chat/?room=phpworkshop`) is displayed alongside the PIN; scanning it pre-fills the session name on the join form while the PIN must still be entered manually from the beamer

#### Scenario: QR code collapsed / expanded
- **WHEN** the controller clicks the "QR Code ▾" toggle button
- **THEN** the QR code section smoothly collapses (hidden) or expands (visible); the chevron rotates to reflect the current state; the QR code starts expanded by default

#### Scenario: Join URL display format
- **WHEN** the join URL is rendered below the QR code
- **THEN** only the path and query string are displayed (e.g., `/chat/?room=phpworkshop`) to save space on the beamer; the "Copy URL" button copies the full URL including origin (e.g., `https://groningenphp.nl/chat/?room=phpworkshop`)

---

### Requirement: Participant join flow
A participant SHALL be able to join a room by entering the session name and 5-digit PIN. The PIN is never transmitted in the URL.

#### Scenario: Successful join
- **WHEN** a participant enters both the session name and a valid 5-digit PIN and clicks "Join"
- **THEN** the app connects to the controller peer, receives the full message history, and the participant chat view becomes active showing the session name and history

#### Scenario: Successful join via link
- **WHEN** a participant opens a `/chat/?room={name}` URL (e.g., from a QR code or shared link)
- **THEN** the session name field is pre-filled from the URL-decoded value (case-insensitive), and the participant types the PIN manually before clicking "Join"

#### Scenario: Session name mismatch
- **WHEN** a participant successfully connects by PIN but the session name returned by the controller does not match what the participant entered (case-insensitive)
- **THEN** the connection is immediately closed, an error is shown ("Wrong session — host says this is '…'. Check the name and try again."), and the participant is returned to the join form

#### Scenario: Invalid or offline PIN
- **WHEN** a participant enters a PIN for which no controller is found within a timeout period
- **THEN** the app displays a clear error message and allows the participant to retry

#### Scenario: Participant display name
- **WHEN** a participant joins for the first time
- **THEN** they are prompted to enter a display name (defaulting to "Guest-XXXX" if left blank) that will appear next to their messages

---

### Requirement: Participant name ownership
A participant's display name SHALL be reserved for them for the entire duration of the controller session, identified by a secret token issued by the controller on first join.

#### Scenario: Name token issued on first join
- **WHEN** a participant connects with a display name that is not yet claimed in the session
- **THEN** the controller registers the name (case-insensitive), generates a cryptographically random token, and returns it to the participant inside the `history` packet (`yourToken`, `yourName`)

#### Scenario: Token stored in browser
- **WHEN** the participant receives a `yourToken` value
- **THEN** the token is stored in `localStorage` under the key `phpgrn-token-{pin}` so it persists across page navigations and widget re-loads within the same browser

#### Scenario: Reconnect restores name
- **WHEN** a participant reconnects (e.g., navigates to a different exercise page with the widget, or refreshes) and the stored token is still valid in the controller
- **THEN** the controller restores the participant's original display name without re-prompting, and the participant re-joins seamlessly

#### Scenario: Reconnect with a different name
- **WHEN** a participant reconnects with a valid token but enters a different display name
- **THEN** the controller checks the new name is not already taken; if free, the old name is retired (kept locked to the same token) and the new name is registered; the same token is reused so the participant retains ownership of both names; if the new name is already taken the participant is rejected and their old name reservation remains intact

#### Scenario: Previous names remain locked
- **WHEN** a participant changes their display name during a session
- **THEN** their previous name(s) remain reserved and cannot be claimed by other participants; up to 5 previous names are held per participant; if a sixth name change occurs, the oldest retired name is finally released

#### Scenario: Name conflict — different token
- **WHEN** a participant requests a display name that is already registered to a different token in this session (whether active or retired)
- **THEN** the controller sends a `{ type: 'name-taken', reason: "…" }` message, closes the connection, and the participant is returned to the join form with a clear error message

#### Scenario: Name conflict check is case-insensitive
- **WHEN** a participant requests the name "Alice" and "alice" or "ALICE" is already registered
- **THEN** the name is treated as taken regardless of casing

#### Scenario: Token cleared on session end
- **WHEN** the participant receives a `session-end` message from the controller
- **THEN** the stored token is removed from `localStorage` so the name is available for a new session starting with the same PIN

---

### Requirement: Real-time chat messaging
All connected peers SHALL be able to send and receive plain-text chat messages in real time.

#### Scenario: Participant sends a message
- **WHEN** a participant types a message and submits it
- **THEN** the message is rendered immediately in the participant's own feed and sent to the controller, which relays it to all other connected participants and displays it on the controller screen

#### Scenario: Controller sends a message
- **WHEN** the controller types and submits a message
- **THEN** the message is broadcast directly to all connected participants

#### Scenario: Message display order
- **WHEN** multiple messages are in the chat
- **THEN** they are displayed in chronological order with sender name and timestamp

#### Scenario: Auto-scroll on new message
- **WHEN** a new message or code snippet is added to the feed and the auto-scroll checkbox is enabled
- **THEN** the feed scrolls to the bottom after the browser has completed layout so the latest content is fully visible (implemented via `requestAnimationFrame` to handle dynamically-sized content such as highlighted code blocks)

#### Scenario: Auto-scroll toggle
- **WHEN** a user unchecks the "Auto-scroll" checkbox
- **THEN** new messages are added to the feed but the scroll position does not change, allowing the user to read earlier messages undisturbed; re-checking the checkbox re-enables automatic scrolling

#### Scenario: Input bar always in viewport
- **WHEN** the chat view is active
- **THEN** the message input bar and auto-scroll checkbox are always visible at the bottom of the screen regardless of the number of messages; the feed area scrolls internally rather than pushing UI controls off-screen

#### Scenario: Beamer-optimized controller view
- **WHEN** the controller view is showing messages
- **THEN** message text is displayed at a minimum font size of 1.8rem and code snippets at 1.15rem, with high contrast and a light background on code blocks (GitHub light theme via Highlight.js), so all content is legible from across a room

---

### Requirement: Team color assignment
The controller SHALL be able to assign a pastel team color to each connected participant. All messages — including previously sent ones and code snippets — SHALL immediately reflect the assigned color across every connected feed.

#### Scenario: Controller assigns a team color
- **WHEN** the controller clicks the color circle next to a participant's name in the sidebar
- **THEN** a palette of 16 distinct pastel colors (plus a "None" option) appears; selecting one broadcasts an `{ type: 'assign-color', name, colorId }` message to all participants, updates the controller's own feed, and stores the assignment in the in-memory `nameColors` map

#### Scenario: Color applied to chat messages
- **WHEN** a team color is assigned to a participant
- **THEN** all chat messages from that participant — both existing and future ones — have their background set to the assigned pastel color, spanning the full width of the feed

#### Scenario: Color applied to code snippets
- **WHEN** a team color is assigned to a participant
- **THEN** all code snippets from that participant — both existing and future ones — receive a left accent border in the color's more saturated variant and the snippet header bar is filled with the pastel background color

#### Scenario: Retroactive recoloring
- **WHEN** the controller changes a participant's team color (or removes it)
- **THEN** all previously rendered messages for that participant in every open feed are immediately updated without a page reload

#### Scenario: Color persists for late joiners
- **WHEN** a participant joins after colors have been assigned
- **THEN** the `history` packet includes the current `colors` map; the participant renders the full history with the correct team colors already applied

#### Scenario: Color cleared on session end
- **WHEN** a new controller session starts or a participant's session ends
- **THEN** all `nameColors` assignments are reset so no color bleeds into a new session

---

### Requirement: Code snippet sharing
Users SHALL be able to share syntax-highlighted code snippets in the chat for PHP and JavaScript.

#### Scenario: Opening the snippet dialog
- **WHEN** a user clicks the "Share Code" button
- **THEN** a dialog/panel opens with a language selector (PHP, JavaScript) and a multi-line code input area

#### Scenario: Sending a snippet
- **WHEN** a user submits a code snippet
- **THEN** it is rendered immediately in the sender's own feed and sent as a structured message; other participants receive it relayed by the controller, all rendered with syntax highlighting using Highlight.js (GitHub light theme) in a distinct visual container with a light background for maximum readability

#### Scenario: Copy snippet to clipboard
- **WHEN** a user clicks the "Copy" button on a rendered code snippet
- **THEN** the raw code is copied to the clipboard and the button briefly shows a "Copied!" confirmation

#### Scenario: Snippet language label
- **WHEN** a code snippet is rendered
- **THEN** the selected language (e.g., "PHP" or "JavaScript") is displayed as a badge on the snippet container

---

### Requirement: Self-contained styling
The app SHALL use GroningenPHP brand CSS custom properties and fonts so it visually matches the existing site.

#### Scenario: Brand colors applied
- **WHEN** the chat app is rendered
- **THEN** it uses `--groningen-red: #DA121A`, `--groningen-blue: #0F47AF`, `--groningen-green: #078930` for primary UI elements

#### Scenario: No external CSS framework dependency
- **WHEN** the page is loaded
- **THEN** all styles are defined inline or in a `<style>` block within the single HTML file; no Bootstrap or Tailwind CDN links are required

---

### Requirement: Connection status indicators
The app SHALL clearly communicate connection state to the user at all times.

#### Scenario: Connecting state
- **WHEN** the app is establishing a PeerJS connection
- **THEN** a visible "Connecting…" indicator is shown

#### Scenario: Connected state
- **WHEN** the peer connection is established
- **THEN** the indicator changes to "Connected" with a green status dot

#### Scenario: Disconnected or error state
- **WHEN** the connection is lost or an error occurs
- **THEN** the indicator changes to a red/orange state with an actionable message (e.g., "Disconnected — Reconnecting…")

#### Scenario: Signaling server reconnect
- **WHEN** the PeerJS signaling server connection drops (e.g., a transient network blip)
- **THEN** both the controller and participant automatically attempt to reconnect to the signaling server without user intervention; existing WebRTC data channels between peers remain open during the blip and are unaffected; no alarming error message is shown to the user

---

### Requirement: Chat history replay for late joiners
The controller SHALL maintain the full in-memory message history and deliver it to any participant that joins after the session has started.

#### Scenario: Late joiner receives history
- **WHEN** a participant connects to a room that already has messages
- **THEN** the controller sends a `{ type: 'history', messages: [...] }` packet as the first message on that connection, and the participant renders all historical messages before the live feed resumes

#### Scenario: No history on first join
- **WHEN** a participant is the first to connect to a freshly started room
- **THEN** the history packet contains an empty array and the participant sees an empty chat feed

#### Scenario: History is in-memory only
- **WHEN** the controller page is refreshed or closed
- **THEN** the message history is gone; the session cannot be resumed and all history is lost

---

### Requirement: Session lifecycle — closed on controller exit
The chat session SHALL be considered active only while the controller page is open. Closing or navigating away from the controller page ends the session for all participants.

#### Scenario: Controller navigates away — confirmation dialog
- **WHEN** the controller attempts to close the tab, refresh the page, or navigate away while a session is active
- **THEN** the browser shows a "Leave site?" confirmation dialog warning that the session will end for all participants; dismissing it keeps the session running

#### Scenario: Controller closes the page
- **WHEN** the controller confirms navigation or closes the browser tab (`beforeunload` / `pagehide` event fires)
- **THEN** the controller sends a `{ type: 'session-end', reason: 'host-closed' }` message to all connected participants before the connection drops

#### Scenario: Participant receives session-end
- **WHEN** a participant receives a `session-end` message
- **THEN** the chat input is disabled and a "Session ended by the host. Returning to start…" notice is shown; after 3 seconds the peer connection is torn down, all client state (feed, display name, token, color map) is wiped, and the participant is returned to the role-selection screen

#### Scenario: Participant detects abrupt disconnect
- **WHEN** the controller connection closes without a `session-end` message (e.g., network loss)
- **THEN** the participant sees a "Host disconnected — session may have ended" warning and the input is disabled after a short grace period

---

### Requirement: Controller fullscreen / beamer mode
The controller view SHALL provide a one-click fullscreen mode that maximises the chat feed and sidebar for projection on a beamer while hiding UI controls that are not needed during presentation.

#### Scenario: Enter fullscreen
- **WHEN** the controller clicks the ⛶ button in the status row
- **THEN** the browser enters fullscreen, the site header, message input bar, and auto-scroll checkbox are hidden, and the feed expands to fill the full viewport height; the PIN, QR code, participant list, and session name remain visible

#### Scenario: Exit fullscreen
- **WHEN** the controller clicks the ✕ button or presses Escape
- **THEN** the browser exits fullscreen, all previously hidden UI elements are restored, and the ⛶ button reappears

#### Scenario: Fullscreen is display-only
- **WHEN** the controller is in fullscreen mode
- **THEN** new messages sent by participants continue to arrive and are displayed in real time, but the controller cannot type or send messages; they must exit fullscreen to interact

---

### Requirement: Embeddable participant widget
The participant chat client SHALL be available as a self-initializing JavaScript widget that can be embedded into any existing workshop page without requiring the user to navigate away.

#### Scenario: Widget added to a workshop page
- **WHEN** `/chat/widget.js` is included in a workshop page's HTML
- **THEN** a floating chat button appears in the bottom-right corner of the page without disrupting the page layout

#### Scenario: Widget expand and collapse
- **WHEN** a participant clicks the floating chat button
- **THEN** the widget expands into a chat panel (message feed + input bar + "Share Code" button); clicking again or pressing Escape collapses it

#### Scenario: Widget initialised with session name via data attribute
- **WHEN** the script tag has a `data-session` attribute (e.g., `<script src="widget.js" data-session="PHP Workshop June 2026">`)
- **THEN** the session name is pre-filled and the participant only needs to enter the PIN and their display name to join

#### Scenario: Widget initialised with session name via URL parameter
- **WHEN** the host page URL contains `?room={name}` (URL-encoded)
- **THEN** the widget decodes the value and pre-fills the session name; the PIN must still be entered manually

#### Scenario: Widget without pre-filled session name
- **WHEN** no session name is provided via data attribute or URL parameter
- **THEN** the widget shows both a session name field and a PIN field when expanded

#### Scenario: Widget inherits page styles
- **WHEN** the widget is rendered on a page that already loads `styles.css`
- **THEN** the widget uses the existing CSS custom properties (`--groningen-red`, `--groningen-blue`, `--groningen-green`) so it visually matches the host page

#### Scenario: Widget is independent of full-page app
- **WHEN** `widget.js` is loaded on a page that does NOT include the full `index.html` chat app
- **THEN** the widget functions fully as a standalone participant client with no dependency on the full-page app being present

---

### Requirement: Isolated multi-room support
Multiple simultaneous chat rooms SHALL be able to operate without any cross-room message interference, relying on the uniqueness of each room's PIN.

#### Scenario: Two rooms operate simultaneously
- **WHEN** two controllers each start a room with different PINs (and different session names)
- **THEN** participants in room A see only room A messages, and participants in room B see only room B messages; no cross-room leakage occurs

#### Scenario: PIN uniqueness on collision
- **WHEN** a generated PIN is already claimed on the PeerJS signaling server
- **THEN** the app automatically retries with a new PIN until a free one is found
