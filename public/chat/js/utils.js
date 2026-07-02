export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function generatePin() {
    return String(Math.floor(10000 + Math.random() * 90000));
}

export function generateToken() {
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.toggle('active', s.id === id);
    });
}

export function updateStatus(dotId, textId, text, statusClass) {
    const dot = document.getElementById(dotId);
    const txt = document.getElementById(textId);
    if (!dot || !txt) return;
    dot.className = 'status-dot ' + statusClass;
    txt.textContent = text;
}

export function scrollFeedToBottom(feedEl) {
    const checkboxId = feedEl.id === 'ctrl-feed' ? 'ctrl-autoscroll' : 'part-autoscroll';
    const checkbox = document.getElementById(checkboxId);
    if (checkbox && !checkbox.checked) return;
    requestAnimationFrame(() => { feedEl.scrollTop = feedEl.scrollHeight; });
}

export function applyHighlight(codeEl) {
    if (window.hljs && !codeEl.classList.contains('language-plaintext')) hljs.highlightElement(codeEl);
}

// Free community TURN relay servers — sufficient for workshop use.
// For higher reliability, replace with credentials from https://www.metered.ca/tools/openrelay/
const RELAY_ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    {
        urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turns:openrelay.metered.ca:443',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

export function getPeerConfig(useRelay) {
    if (!useRelay) return {};
    return { config: { iceServers: RELAY_ICE_SERVERS } };
}
