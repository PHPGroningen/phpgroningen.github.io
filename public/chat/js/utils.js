import { state } from './state.js';

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

export function generateParticipantId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return generateToken();
}

export function getMqttBrokerUrl() {
    return state.mqttBrokerUrl || 'wss://broker.emqx.io:8084/mqtt';
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
